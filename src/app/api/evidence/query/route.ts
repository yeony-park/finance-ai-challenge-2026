import { resolveOfferingsRepository } from "@/lib/db/repositories/offerings";
import { resolveProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { OFFERS } from "@/components/site/offers";
import {
  answerFromCommonEvidence,
  answerFromEvidence,
  answerFromOfferingKnowledge,
  answerFromProductKnowledge,
} from "@/lib/knowledge/evidence";
import { invalidRequest, internalError, parseEvidenceRequest } from "@/lib/knowledge/http";
import {
  findLegacyScenarioScope,
  loadApprovedScenarios,
  loadCommonKnowledgeScope,
  loadKnowledgeScope,
} from "@/lib/knowledge/loader";
import { findPublishedOfferingScope } from "@/lib/knowledge/retrieval";
import {
  authorizeKnowledgeAiHttpRequest,
  retrieveExactProductEvidence,
} from "@/lib/knowledge/search-orchestration";
import {
  loadApprovedCattleFilingArtifactsForProduct,
  matchesCattleFilingKnowledge,
} from "@/lib/knowledge/cattle-filing-artifact";
import {
  loadApprovedPigFilingArtifactsForProduct,
  matchesPigFilingKnowledge,
} from "@/lib/knowledge/pig-filing-artifact";
import {
  filingCorpusKnowledge,
  loadFilingCorpusProductSnapshot,
  matchesFilingCorpusKnowledge,
} from "@/lib/knowledge/filing-corpus";
import {
  guardFilingCorpusLiveAnswer,
  isFilingCorpusApprovedForExternalAi,
} from "@/lib/knowledge/local-rag/corpus";
import { generateLiveEvidenceAnswer } from "@/lib/knowledge/live-answer";
import {
  loadSyntheticArtCommonKnowledgeScope,
  isSyntheticArtApprovedForExternalAi,
  guardSyntheticArtLiveAnswer,
  SYNTHETIC_ART_SCENARIO_ID,
} from "@/lib/art/synthetic-catalog";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseEvidenceRequest(request);
  if (!query) return invalidRequest();

  try {
    const access = authorizeKnowledgeAiHttpRequest(request);
    const disabledLiveAnswer = access.allowed ? undefined : async () => null;
    if ("productId" in query) {
      const population = query.categoryId === "real-estate" ? await loadApprovedScenarios() : [];
      const scenario = query.dataNature === "scenario" && query.scenarioId
        ? findLegacyScenarioScope(population, {
            categoryId: query.categoryId,
            offerId: query.productId,
            scenarioId: query.scenarioId,
          })
        : null;
      const commonScope = query.namespace === "legacy-scenario"
        ? null
        : query.categoryId === "art" && query.dataNature === "scenario" && query.scenarioId === SYNTHETIC_ART_SCENARIO_ID
          ? await loadSyntheticArtCommonKnowledgeScope(query.productId)
          : await loadCommonKnowledgeScope(
              query.categoryId,
              query.productId,
              query.dataNature,
              undefined,
              query.scenarioId,
            );
      const offeringsRepository = query.namespace === "common" || query.namespace === "legacy-scenario"
        ? null
        : await resolveOfferingsRepository();
      const publishedScope = offeringsRepository
        ? await findPublishedOfferingScope(offeringsRepository, query.categoryId, query.productId)
        : null;
      const inferredPigArtifacts =
        query.namespace === undefined && query.categoryId === "pig" && query.dataNature === "observed"
          ? await loadApprovedPigFilingArtifactsForProduct(query.categoryId, query.productId)
          : [];
      if (publishedScope?.status === "category-mismatch") return invalidRequest();
      if (!query.namespace && [
        Boolean(scenario),
        Boolean(commonScope?.product),
        publishedScope?.status === "found" || inferredPigArtifacts.length > 0,
      ].filter(Boolean).length > 1) {
        return invalidRequest();
      }
      if (query.namespace === "published-offer" || publishedScope?.status === "found" || inferredPigArtifacts.length > 0) {
        const productKnowledgeRepository = await resolveProductKnowledgeRepository();
        const productKnowledge = await productKnowledgeRepository.findExact({
          categoryId: query.categoryId,
          productId: query.productId,
          dataNature: "observed",
        });
        const registryProduct = OFFERS.find((offer) =>
          offer.id === query.productId &&
          (offer.assetKind === "real-estate" ? "real-estate" : "cattle") === query.categoryId
        );
        const cattleArtifacts = query.categoryId !== "cattle"
          ? []
          : await loadApprovedCattleFilingArtifactsForProduct(query.categoryId, query.productId);
        const pigArtifacts = inferredPigArtifacts.length > 0 ? inferredPigArtifacts : (query.categoryId !== "pig"
          ? []
          : await loadApprovedPigFilingArtifactsForProduct(query.categoryId, query.productId));
        const filingSnapshot = await loadFilingCorpusProductSnapshot(query.categoryId, query.productId);
        const filingCorpus = filingSnapshot?.index ?? null;
        const publishedArtifactNamespace = query.namespace !== "common" && query.namespace !== "legacy-scenario";
        const corpusBacked = filingCorpus !== null && publishedArtifactNamespace &&
          matchesFilingCorpusKnowledge(filingCorpus, productKnowledge);
        const filingExternalAiApproved = corpusBacked && filingSnapshot !== null &&
          await isFilingCorpusApprovedForExternalAi("data", filingSnapshot.manifestSha256);
        const approvedFilingKnowledge = filingExternalAiApproved && filingCorpus
          ? filingCorpusKnowledge(filingCorpus)
          : null;
        const aiProductKnowledge = approvedFilingKnowledge ? {
          ...approvedFilingKnowledge,
          documents: approvedFilingKnowledge.documents.map((item) => ({ ...item, approvedForExternalAi: true })),
          chunks: approvedFilingKnowledge.chunks.map((item) => ({ ...item, approvedForExternalAi: true })),
          evidenceGroups: productKnowledge.evidenceGroups,
        } : productKnowledge;
        const artifactDocumentIds = new Set([...cattleArtifacts, ...pigArtifacts].map((item) => item.document.documentId));
        const artifactKnowledge = {
          documents: productKnowledge.documents.filter((item) => artifactDocumentIds.has(item.documentId)),
          chunks: productKnowledge.chunks.filter((item) => artifactDocumentIds.has(item.documentId)),
          evidenceGroups: productKnowledge.evidenceGroups,
        };
        const legacyArtifactBacked = publishedArtifactNamespace && (
          cattleArtifacts.length > 0 && registryProduct !== undefined && matchesCattleFilingKnowledge(cattleArtifacts, artifactKnowledge) ||
          pigArtifacts.length > 0 && matchesPigFilingKnowledge(pigArtifacts, artifactKnowledge)
        );
        const artifactBacked = legacyArtifactBacked || corpusBacked && (
          query.categoryId === "pig" && pigArtifacts.length > 0 ||
          query.categoryId === "cattle" && cattleArtifacts.length > 0 && registryProduct !== undefined
        );
        const filingRuntimeReason = artifactBacked && !filingExternalAiApproved
          ? "disabled"
          : access.allowed ? undefined : access.reason;
        const liveAnswer = disabledLiveAnswer ?? (filingExternalAiApproved && filingSnapshot !== null
          ? guardFilingCorpusLiveAnswer("data", filingSnapshot.manifestSha256, generateLiveEvidenceAnswer)
          : artifactBacked ? async () => null : undefined);
        if ((cattleArtifacts.length > 0 || query.categoryId === "pig") && publishedArtifactNamespace && !artifactBacked) return invalidRequest();
        if (publishedScope?.status !== "found" && !artifactBacked) return invalidRequest();
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            dataNature: "observed",
          },
          namespace: "common",
          query: query.query,
          limit: query.limit,
          repository: productKnowledgeRepository,
          fallbackChunks: aiProductKnowledge.chunks,
          runtimeAiAllowed: artifactBacked && !filingExternalAiApproved ? false : access.allowed,
          ...(filingRuntimeReason ? { runtimeReason: filingRuntimeReason } : {}),
        });
        if (artifactBacked && exactRetrieval.evidence.some((item) => !productKnowledge.chunks.some((chunk) =>
          chunk.documentId === item.documentId && chunk.chunkId === item.chunkId &&
          chunk.sourceHash === item.sourceHash && chunk.chunkHash === item.chunkHash
        ))) return invalidRequest();
        const response = {
          categoryId: query.categoryId,
          productId: query.productId,
          dataNature: "observed",
          namespace: "published-offer",
          retrieval: {
            storage: {
              offerings: offeringsRepository!.mode,
              productKnowledge: productKnowledgeRepository.mode,
            },
            degraded: productKnowledgeRepository.mode === "file" || exactRetrieval.retrieval.degraded,
            semantic: exactRetrieval.retrieval.semantic,
            strategy: exactRetrieval.retrieval.strategy,
            ...(exactRetrieval.retrieval.reason ? { reason: exactRetrieval.retrieval.reason } : {}),
            planner: exactRetrieval.retrieval.planner,
          },
          ...(publishedScope?.status === "found"
            ? await answerFromOfferingKnowledge(
                publishedScope.offering,
                query.query,
                productKnowledge,
                {
                  limit: query.limit,
                  evidence: exactRetrieval.evidence,
                  ...(liveAnswer ? { liveAnswer } : {}),
                },
              )
            : await answerFromProductKnowledge(
                {
                  categoryId: query.categoryId,
                  productId: query.productId,
                  dataNature: "observed",
                },
                query.query,
                productKnowledge,
                {
                  limit: query.limit,
                  evidence: exactRetrieval.evidence,
                  ...(liveAnswer ? { liveAnswer } : {}),
                },
              )),
        };
        if (filingExternalAiApproved && filingSnapshot !== null &&
          !await isFilingCorpusApprovedForExternalAi("data", filingSnapshot.manifestSha256)) {
          throw new Error("filing corpus external AI approval changed during request");
        }
        return Response.json(response);
      }
      if (query.namespace === "legacy-scenario" && !scenario) return invalidRequest();
      if (scenario && query.namespace !== "common" && !commonScope?.product) {
        const legacyQuery = {
          scenarioId: scenario.scenarioId,
          offerId: scenario.offerId,
          q: query.query,
          limit: query.limit,
        };
        const scope = await loadKnowledgeScope(scenario.scenarioId, scenario.offerId);
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            scenarioId: scenario.scenarioId,
            dataNature: "scenario",
          },
          namespace: "legacy-scenario",
          query: query.query,
          limit: query.limit,
          fallbackChunks: scope.chunks,
          runtimeAiAllowed: access.allowed,
          ...(!access.allowed ? { runtimeReason: access.reason } : {}),
        });
        return Response.json({
          categoryId: query.categoryId,
          productId: query.productId,
          scenarioId: scenario.scenarioId,
          dataNature: "scenario",
          namespace: "legacy-scenario",
          retrieval: exactRetrieval.retrieval,
          ...(await answerFromEvidence(scope, legacyQuery, {
            population,
            evidence: exactRetrieval.evidence,
            ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
          })),
        });
      }
      const scope = commonScope ?? { product: null, documents: [], chunks: [] };
      const isSyntheticArtScope = query.categoryId === "art" &&
        query.dataNature === "scenario" &&
        query.scenarioId === SYNTHETIC_ART_SCENARIO_ID;
      const syntheticArtSourceHash = isSyntheticArtScope ? scope.documents[0]?.sourceHash : undefined;
      const syntheticArtExternalAiApproved = !isSyntheticArtScope || (
        syntheticArtSourceHash !== undefined &&
        await isSyntheticArtApprovedForExternalAi("data", syntheticArtSourceHash)
      );
      const commonRuntimeAiAllowed = access.allowed && syntheticArtExternalAiApproved;
      const exactRetrieval = await retrieveExactProductEvidence({
        scope: {
          categoryId: query.categoryId,
          productId: query.productId,
          ...(query.scenarioId ? { scenarioId: query.scenarioId } : {}),
          dataNature: query.dataNature,
        },
        namespace: "common",
        query: query.query,
        limit: query.limit,
        fallbackChunks: scope.chunks,
        runtimeAiAllowed: commonRuntimeAiAllowed,
        ...(!commonRuntimeAiAllowed ? { runtimeReason: access.allowed ? "disabled" : access.reason } : {}),
      });
      const commonLiveAnswer = disabledLiveAnswer ?? (isSyntheticArtScope
        ? syntheticArtExternalAiApproved && syntheticArtSourceHash
          ? guardSyntheticArtLiveAnswer("data", syntheticArtSourceHash, generateLiveEvidenceAnswer)
          : async () => null
        : undefined);
      return Response.json({
        categoryId: query.categoryId,
        productId: query.productId,
        dataNature: query.dataNature,
        namespace: "common",
        retrieval: exactRetrieval.retrieval,
        ...(scope.product?.scenarioId ? { scenarioId: scope.product.scenarioId } : {}),
        ...(await answerFromCommonEvidence(
          scope,
          { ...query, q: query.query },
          {
            evidence: exactRetrieval.evidence,
            ...(commonLiveAnswer ? { liveAnswer: commonLiveAnswer } : {}),
          },
        )),
      });
    }
    const [scope, population] = await Promise.all([
      loadKnowledgeScope(query.scenarioId, query.offerId),
      loadApprovedScenarios(),
    ]);
    const exactRetrieval = await retrieveExactProductEvidence({
      scope: {
        categoryId: scope.scenario?.categoryId ?? "real-estate",
        productId: query.offerId,
        scenarioId: query.scenarioId,
        dataNature: "scenario",
      },
      namespace: "legacy-scenario",
      query: query.query,
      limit: query.limit,
      fallbackChunks: scope.chunks,
      runtimeAiAllowed: access.allowed,
      ...(!access.allowed ? { runtimeReason: access.reason } : {}),
    });
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      retrieval: exactRetrieval.retrieval,
      ...(await answerFromEvidence(scope, { ...query, q: query.query }, {
        population,
        evidence: exactRetrieval.evidence,
        ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
      })),
    });
  } catch {
    return internalError();
  }
};
