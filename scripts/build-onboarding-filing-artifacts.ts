import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAndWriteCattleFilingDerivedArtifact,
  verifyCattleFilingDerivedArtifact,
} from "@/lib/verify/dart/filing-derived";
import { DartFilingRegistrySchema } from "@/lib/verify/dart/filing-registry";
import {
  ONBOARDING_CATALOG,
  type OnboardingCategory,
} from "@/lib/verify/dart/onboarding-catalog";
import { ProductFilingRegistryV2Schema } from "@/lib/verify/dart/product-filing-registry";
import {
  buildAndWritePigFilingDerivedArtifact,
  PigFilingRegistrySchema,
  verifyPigFilingDerivedArtifact,
} from "@/lib/verify/dart/pig-filing";

const DATA_ROOT = path.resolve(process.cwd(), "data");
const RISK_LOCATOR = {
  factId: "principal-not-guaranteed",
  title: "원금 미보장",
  anchor: "원금 미보장",
  sectionPath: ["요약정보", "1. 핵심투자위험", "1. 핵심투자위험"],
  occurrence: 1,
  evidenceTokens: ["원금", "미보장"],
  normalizedExcerptHash: "b908494f43183eec74a424c7b354ef119eeee844859d2d5f82ba4568e28833af",
} as const;
const TRACE_CANDIDATE = /(?<!\d)(?:\d{9}|\d{12}|\d{15})(?!\d)/;
const CATTLE_PII = /(?:이력번호|농장번호|농장주|상세주소|사육이력)/;
const PIG_PII = /농장|주소|소재지|개체|이력|주민등록|생년월일|성명|대표자|연락처|이메일|전화|계좌/;

type Expansion = {
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly rcpNo: string;
  readonly sourceHash: string;
  readonly documentRole: "securities-registration" | "issuer-context";
  readonly maskedObservation?: { readonly reportPath: string; readonly sha256: string };
};

const EXPANSIONS: readonly Expansion[] = [
  { categoryId: "cattle", productId: "livestock-1", rcpNo: "20240220002223", sourceHash: "59e68d9fb20b9c3284f2c837d76b4a386537f481a959f561eee73489c95576c7", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-1/report-2026-08-14T18-14-36-550Z.json", sha256: "187f22ff2642b8bc3a8cf6193f78d72fc86e325f373e2d47bafd229e38c41878" } },
  { categoryId: "cattle", productId: "livestock-2", rcpNo: "20240821000374", sourceHash: "48e13cc7a42fe969f756cf4a719f3b9e86d96a66699806b94c618b78cf3c4fc7", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-2/report-2026-08-14T18-17-47-890Z.json", sha256: "f071e206338a1d24fc596d4fd944819b0f5054095ebfa67cd5e77d44d866822c" } },
  { categoryId: "cattle", productId: "livestock-3", rcpNo: "20241202000302", sourceHash: "88651e11da1f123857e192456fe30f50cf14017d1a37380980446858e45e6eee", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-3/report-2026-08-14T18-21-45-354Z.json", sha256: "0af18765e6514dc126254b2181dba5ec23e80dbe0d1bbbccf38e7b0279fdb314" } },
  { categoryId: "cattle", productId: "livestock-4", rcpNo: "20250310000915", sourceHash: "079a0827378010c0ce26721842db8a77f4987d00a3b00ebe225038c11db993c6", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-4/report-2026-08-14T18-27-09-373Z.json", sha256: "a7a8041e7f67b74031c3b259aa9fb19f74bd55557906648868baca5fdfaeaa9b" } },
  { categoryId: "cattle", productId: "livestock-5", rcpNo: "20250508000518", sourceHash: "c0eed5c085ceb1e6a27c29f9f81dfbe8f4280f8117af0101a780693a874dd1e4", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-5/report-2026-08-14T18-29-57-467Z.json", sha256: "04328e6bc4bf55306d328b7429c7a50f09570ecfe8969c888f2c0d2f58ad470d" } },
  { categoryId: "cattle", productId: "livestock-6", rcpNo: "20251010000109", sourceHash: "6cd2143b27e523bf7574cd99f41e22ca8931b4a54ef9e330689dc39f8a1c0943", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-6/report-2026-08-14T18-33-15-584Z.json", sha256: "1f3944cb6fba20a22e3e70d1a169b4d72747cf0d294c82906ca5aaa2fc76371c" } },
  { categoryId: "cattle", productId: "livestock-7", rcpNo: "20260203000427", sourceHash: "04be5f4dcdb9704adcff3b45191a927fa0a140d9c4f0daa477637e012dace21f", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-7/report-2026-08-14T17-25-29-254Z.json", sha256: "15591e82115100778e58a01201bfbd849a60eeabe9a0e98e14417a1782d07d1b" } },
  { categoryId: "cattle", productId: "livestock-8", rcpNo: "20260326001272", sourceHash: "f64cd09824179e1a49355711ff52cbd57072475b60153facd4449a41ca3555ac", documentRole: "issuer-context", maskedObservation: { reportPath: "public/livestock-8/report-2026-08-14T17-30-09-105Z.json", sha256: "8eda6ba683b04e820ca6806890572ad376f63a69ba02b87d37c5b9c86f934e26" } },
  { categoryId: "pig", productId: "pig-2", rcpNo: "20260420000157", sourceHash: "d47c868369c30b435851411669c899208eada23a1fdf2882664d1b3b52453dd2", documentRole: "securities-registration" },
  { categoryId: "pig", productId: "pig-3", rcpNo: "20260605000175", sourceHash: "4c1d0f7358bfea53003e893fd246d9f27582a68436bfd313e28744b0c1ecfd53", documentRole: "securities-registration" },
];

const submittedOn = (rcpNo: string): string => `${rcpNo.slice(0, 4)}-${rcpNo.slice(4, 6)}-${rcpNo.slice(6, 8)}`;

const approvedBinding = (entry: Expansion) => {
  const product = ONBOARDING_CATALOG.find((candidate) => candidate.categoryId === entry.categoryId && candidate.productId === entry.productId);
  const binding = product?.approvedFilings.find((candidate) => candidate.rcpNo === entry.rcpNo);
  if (!product || product.status !== "ready-local" || product.activeRcpNo !== entry.rcpNo || !binding) {
    throw new Error(`v2 catalog approval이 준비되지 않았습니다: ${entry.categoryId}/${entry.productId}/${entry.rcpNo}`);
  }
  const locatorSetHash = "73cb64ad711ada27dc38b92960f07975d620b10f3b88b77e0994649bc1ee97b0";
  if (binding.contentHash !== entry.sourceHash || binding.reviewer !== "codex-local-deterministic-check" ||
    binding.reviewMethod !== "deterministic-local-codex-review-v1" || binding.documentRole !== entry.documentRole ||
    binding.locatorSetHash !== locatorSetHash) {
    throw new Error(`v2 catalog binding이 수기 검토 정본과 일치하지 않습니다: ${entry.categoryId}/${entry.productId}/${entry.rcpNo}`);
  }
  return { product, binding };
};

const relationshipLimitations = (categoryId: OnboardingCategory): readonly string[] => categoryId === "cattle"
  ? ["onboarding catalog의 exact 후보 RCP 연결만 확인했으며, primary·correction_of·supplement_to 또는 최신 문서 관계는 주장하지 않습니다.", "후보 공시 사이의 정정·보충 관계와 현재값은 원문 표지 및 메타만으로 확정하지 않았습니다."]
  : ["문서 역할과 onboarding catalog의 exact product mapping을 분리해 기록했으며, 승인된 최소 excerpt 밖의 상품 사실은 사용하지 않습니다.", "후속 정정·투자설명서·발행실적보고서가 이 문서를 대체하는지 자동 판단하지 않습니다."];

const childRegistry = (entry: Expansion) => {
  const { binding } = approvedBinding(entry);
  const source = {
    landingUrl: "https://dart.fss.or.kr/dsaf001/main.do",
    exactPublicUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${entry.rcpNo}`,
    collectedAtSource: "local raw XML file mtime" as const,
    method: "OpenDART document.xml exact rcpNo XML entry hash와 승인된 최소 P excerpt를 로컬에서 검증",
  };
  const approval = {
    policyId: "onboarding-product-filing-review-v2",
    scope: `${entry.productId} product-specific PII-free XML excerpt 1개`,
    externalAiApproved: false as const,
    piiReviewStatus: "passed" as const,
  };
  const relationship = {
    type: "issuer_context" as const,
    mappingStatus: "confirmed" as const,
    mappingEvidence: binding.productMappingEvidence,
    limitations: relationshipLimitations(entry.categoryId),
  };
  if (entry.categoryId === "cattle") {
    if (!entry.maskedObservation) throw new Error(`cattle observation이 없습니다: ${entry.productId}`);
    return DartFilingRegistrySchema.parse({
      schemaVersion: 1,
      registryVersion: "dart-filing-registry-v1",
      categoryId: "cattle",
      offerId: entry.productId,
      rcpNo: entry.rcpNo,
      submittedOn: submittedOn(entry.rcpNo),
      entry: { name: `${entry.rcpNo}.xml`, sha256: entry.sourceHash },
      source,
      relationship,
      approval,
      sectionLocators: [RISK_LOCATOR],
      maskedObservation: { ...entry.maskedObservation, allowedFields: ["품종", "성별", "취득시기"] },
    });
  }
  return PigFilingRegistrySchema.parse({
    schemaVersion: 1,
    registryVersion: "dart-pig-filing-registry-v1",
    categoryId: "pig",
    productId: entry.productId,
    rcpNo: entry.rcpNo,
    submittedOn: submittedOn(entry.rcpNo),
    entry: { name: `${entry.rcpNo}.xml`, sha256: entry.sourceHash },
    source,
    relationship,
    documentRole: entry.documentRole,
    approval,
    sectionLocators: [RISK_LOCATOR],
  });
};

const writeJsonAtomically = async (target: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
};

const assertArtifactTextIsPiiFree = (
  categoryId: OnboardingCategory,
  artifact: { readonly sections: readonly { readonly title: string; readonly text: string; readonly sectionPath: readonly string[] }[] },
): void => {
  const forbidden = categoryId === "cattle" ? CATTLE_PII : PIG_PII;
  for (const section of artifact.sections) {
    const text = [section.title, ...section.sectionPath, section.text].join(" ");
    if (forbidden.test(text) || TRACE_CANDIDATE.test(text)) {
      throw new Error(`PII 또는 9·12·15자리 trace 후보가 artifact text에 남았습니다: ${categoryId}`);
    }
  }
};

const main = async (): Promise<void> => {
  for (const entry of EXPANSIONS) {
    const { product, binding } = approvedBinding(entry);
    const registry = childRegistry(entry);
    const envelope = ProductFilingRegistryV2Schema.parse({
      schemaVersion: 2,
      registryVersion: "dart-product-registry-v2",
      categoryId: entry.categoryId,
      productId: entry.productId,
      activeRcpNo: product.activeRcpNo,
      inventory: product.inventory,
      approvedFilings: [{ ...binding, registry }],
    });
    await writeJsonAtomically(path.join(DATA_ROOT, "knowledge", "filing-registry", entry.categoryId, `${entry.productId}.json`), envelope);
    if (entry.categoryId === "cattle") {
      const cattleRegistry = DartFilingRegistrySchema.parse(registry);
      const artifact = verifyCattleFilingDerivedArtifact((await buildAndWriteCattleFilingDerivedArtifact(cattleRegistry, DATA_ROOT)).artifact);
      assertArtifactTextIsPiiFree(entry.categoryId, artifact);
    } else {
      const pigRegistry = PigFilingRegistrySchema.parse(registry);
      const artifact = verifyPigFilingDerivedArtifact((await buildAndWritePigFilingDerivedArtifact(pigRegistry, DATA_ROOT)).artifact);
      assertArtifactTextIsPiiFree(entry.categoryId, artifact);
    }
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "onboarding filing artifact 생성 실패");
  process.exitCode = 1;
});
