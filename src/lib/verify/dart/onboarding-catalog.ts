export type OnboardingCategory = "cattle" | "pig";
export type OnboardingStatus = "ready-local" | "needs-role-review";
export type FilingInventoryStatus = "local" | "source-unavailable";

export interface FilingInventoryEntry {
  readonly rcpNo: string;
  readonly status: FilingInventoryStatus;
  readonly unavailableReason?: "opendart-014";
}

export interface ApprovedFilingBindingV1 {
  readonly schemaVersion: 1;
  readonly rcpNo: string;
  readonly contentHash: string;
  readonly sanitizerVersion: "cattle-filing-sanitizer-v1" | "pig-filing-sanitizer-v1";
  readonly chunkerVersion: "cattle-filing-chunker-v1" | "pig-filing-chunker-v1";
  readonly documentRole: "primary" | "correction" | "investment-description" | "issuance-report" | "securities-registration" | "issuer-context" | "other";
  readonly locatorSetHash: string;
  readonly reviewMethod: "deterministic-local-codex-review-v1";
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly productMappingEvidence: string;
}

export interface OnboardingProduct {
  readonly schemaVersion: 2;
  readonly registryVersion: "dart-product-registry-v2";
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly candidateRcpNos: readonly string[];
  readonly inventory: readonly FilingInventoryEntry[];
  readonly approvedFilings: readonly ApprovedFilingBindingV1[];
  readonly activeRcpNo: string | null;
  readonly status: OnboardingStatus;
  readonly externalAiApproved: false;
}

const BASE_CATALOG = [
  { categoryId: "cattle", productId: "livestock-1", candidateRcpNos: ["20240220002223", "20240503000803", "20240528000156", "20240618000419", "20240619000091"], activeRcpNo: "20240220002223", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-2", candidateRcpNos: ["20240821000374", "20240911000124"], activeRcpNo: "20240821000374", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-3", candidateRcpNos: ["20241202000302", "20241220000182", "20250113000307"], activeRcpNo: "20241202000302", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-4", candidateRcpNos: ["20250310000915", "20250331004328", "20250421000094"], activeRcpNo: "20250310000915", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-5", candidateRcpNos: ["20250508000518", "20250526000153", "20250617000216"], activeRcpNo: "20250508000518", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-6", candidateRcpNos: ["20251010000109", "20251031000477"], activeRcpNo: "20251010000109", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-7", candidateRcpNos: ["20260203000427", "20260210000785", "20260225002022"], activeRcpNo: "20260203000427", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-8", candidateRcpNos: ["20260326001272", "20260414002068"], activeRcpNo: "20260326001272", status: "ready-local", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-9", candidateRcpNos: ["20260806000159", "20260814003572", "20260902000022"], activeRcpNo: "20260814003572", status: "ready-local", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-1", candidateRcpNos: ["20251215000259", "20260107000209", "20260129000008", "20260213000150"], activeRcpNo: "20251215000259", status: "ready-local", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-2", candidateRcpNos: ["20260420000157", "20260506000437", "20260514000004", "20260528001031"], activeRcpNo: "20260420000157", status: "ready-local", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-3", candidateRcpNos: ["20260605000175", "20260624000508", "20260626000400", "20260714000008"], activeRcpNo: "20260605000175", status: "ready-local", externalAiApproved: false },
] as const;

const PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH = "73cb64ad711ada27dc38b92960f07975d620b10f3b88b77e0994649bc1ee97b0";

const deterministicBinding = (input: {
  readonly categoryId: OnboardingCategory;
  readonly rcpNo: string;
  readonly contentHash: string;
  readonly documentRole: ApprovedFilingBindingV1["documentRole"];
  readonly locatorSetHash: string;
  readonly productMappingEvidence: string;
  readonly reviewedAt?: string;
}): ApprovedFilingBindingV1 => ({
  schemaVersion: 1,
  rcpNo: input.rcpNo,
  contentHash: input.contentHash,
  sanitizerVersion: input.categoryId === "cattle" ? "cattle-filing-sanitizer-v1" : "pig-filing-sanitizer-v1",
  chunkerVersion: input.categoryId === "cattle" ? "cattle-filing-chunker-v1" : "pig-filing-chunker-v1",
  documentRole: input.documentRole,
  locatorSetHash: input.locatorSetHash,
  reviewMethod: "deterministic-local-codex-review-v1",
  reviewer: "codex-local-deterministic-check",
  reviewedAt: input.reviewedAt ?? "2026-09-01T00:00:00+09:00",
  productMappingEvidence: input.productMappingEvidence,
});

const cattleMappingEvidence = (productId: string, rcpNo: string): string =>
  `${productId}와 후보 RCP ${rcpNo}의 연결을 승인된 onboarding 입력으로 고정하고, local exact XML의 승인 locator를 결정적으로 재검산했습니다. 공시 간 정정 관계·최신성·현재값은 확정하거나 자동 병합하지 않습니다.`;

const pigMappingEvidence = (productId: string, rcpNo: string): string =>
  `${productId}와 후보 RCP ${rcpNo}의 연결을 승인된 onboarding 입력으로 고정했습니다. 문서 역할은 증권신고서로만 기록하며 상품 매핑 근거와 분리합니다.`;

const APPROVED_BINDINGS: Readonly<Record<string, ApprovedFilingBindingV1>> = {
  "cattle/livestock-1": deterministicBinding({ categoryId: "cattle", rcpNo: "20240220002223", contentHash: "59e68d9fb20b9c3284f2c837d76b4a386537f481a959f561eee73489c95576c7", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-1", "20240220002223") }),
  "cattle/livestock-2": deterministicBinding({ categoryId: "cattle", rcpNo: "20240821000374", contentHash: "48e13cc7a42fe969f756cf4a719f3b9e86d96a66699806b94c618b78cf3c4fc7", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-2", "20240821000374") }),
  "cattle/livestock-3": deterministicBinding({ categoryId: "cattle", rcpNo: "20241202000302", contentHash: "88651e11da1f123857e192456fe30f50cf14017d1a37380980446858e45e6eee", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-3", "20241202000302") }),
  "cattle/livestock-4": deterministicBinding({ categoryId: "cattle", rcpNo: "20250310000915", contentHash: "079a0827378010c0ce26721842db8a77f4987d00a3b00ebe225038c11db993c6", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-4", "20250310000915") }),
  "cattle/livestock-5": deterministicBinding({ categoryId: "cattle", rcpNo: "20250508000518", contentHash: "c0eed5c085ceb1e6a27c29f9f81dfbe8f4280f8117af0101a780693a874dd1e4", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-5", "20250508000518") }),
  "cattle/livestock-6": deterministicBinding({ categoryId: "cattle", rcpNo: "20251010000109", contentHash: "6cd2143b27e523bf7574cd99f41e22ca8931b4a54ef9e330689dc39f8a1c0943", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-6", "20251010000109") }),
  "cattle/livestock-7": deterministicBinding({ categoryId: "cattle", rcpNo: "20260203000427", contentHash: "04be5f4dcdb9704adcff3b45191a927fa0a140d9c4f0daa477637e012dace21f", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-7", "20260203000427") }),
  "cattle/livestock-8": deterministicBinding({ categoryId: "cattle", rcpNo: "20260326001272", contentHash: "f64cd09824179e1a49355711ff52cbd57072475b60153facd4449a41ca3555ac", documentRole: "issuer-context", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: cattleMappingEvidence("livestock-8", "20260326001272") }),
  "cattle/livestock-9": deterministicBinding({
    categoryId: "cattle",
    rcpNo: "20260814003572",
    contentHash: "cc815be9d95de6cbe4a6a16f632cfe65c3f56589ce77caa9c7890fefce8b99e2",
    documentRole: "issuer-context",
    locatorSetHash: "3b009f671f934b92d226274839122f77c32ce76363c7415d2cc5b9a21c9a3bb7",
    reviewedAt: "2026-08-31T00:00:00+09:00",
    productMappingEvidence: "기존 live public report의 document.offerId=livestock-9 및 rcpNo=20260814003572, 승인 filing-facts의 동일 offerId·rcpNo, 그리고 livestock-9 pilot 범위 승인에 의해 이 공시를 해당 상품의 issuer context로 확정합니다. primary 관계는 주장하지 않습니다.",
  }),
  "pig/pig-1": deterministicBinding({
    categoryId: "pig",
    rcpNo: "20251215000259",
    contentHash: "ca68a62f0b1d896c8c853b4daee7bb64e0aec58ee7f0b660a3cec85d59e26b06",
    documentRole: "primary",
    locatorSetHash: "ef1b2ec283971dbaf7dea41693bc126eb65f6b2b613db867afeed364e261c718",
    reviewedAt: "2026-08-31T00:00:00+09:00",
    productMappingEvidence: "사용자가 지정한 pig-1 파일럿과 exact primary RCP를 대조하고, 각 공개 locator가 pig-1 원자 excerpt에 속함을 수기 확인했습니다.",
  }),
  "pig/pig-2": deterministicBinding({ categoryId: "pig", rcpNo: "20260420000157", contentHash: "d47c868369c30b435851411669c899208eada23a1fdf2882664d1b3b52453dd2", documentRole: "securities-registration", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: pigMappingEvidence("pig-2", "20260420000157") }),
  "pig/pig-3": deterministicBinding({ categoryId: "pig", rcpNo: "20260605000175", contentHash: "4c1d0f7358bfea53003e893fd246d9f27582a68436bfd313e28744b0c1ecfd53", documentRole: "securities-registration", locatorSetHash: PRINCIPAL_NOT_GUARANTEED_LOCATOR_SET_HASH, productMappingEvidence: pigMappingEvidence("pig-3", "20260605000175") }),
};

export const ONBOARDING_CATALOG: readonly OnboardingProduct[] = BASE_CATALOG.map((product) => {
  const approved = APPROVED_BINDINGS[`${product.categoryId}/${product.productId}`];
  return {
    schemaVersion: 2,
    registryVersion: "dart-product-registry-v2",
    ...product,
    inventory: product.candidateRcpNos.map((rcpNo) => rcpNo === "20250113000307"
      ? { rcpNo, status: "source-unavailable" as const, unavailableReason: "opendart-014" as const }
      : { rcpNo, status: "local" as const }),
    approvedFilings: approved ? [approved] : [],
  };
});

const EXPECTED_PRODUCTS = [
  ...Array.from({ length: 9 }, (_, index) => `cattle/livestock-${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `pig/pig-${index + 1}`),
] as const;

export const validateOnboardingCatalog = (
  catalog: readonly OnboardingProduct[] = ONBOARDING_CATALOG,
): readonly OnboardingProduct[] => {
  const products = catalog.map((item) => `${item.categoryId}/${item.productId}`).sort();
  if (new Set(products).size !== products.length) throw new Error("onboarding catalog 상품이 중복됐습니다.");
  if (JSON.stringify(products) !== JSON.stringify([...EXPECTED_PRODUCTS].sort())) {
    throw new Error("onboarding catalog 상품 집합이 12개 정본과 일치하지 않습니다.");
  }

  const allRcpNos = new Set<string>();
  let localCount = 0;
  let unavailableCount = 0;
  for (const product of catalog) {
    if (product.schemaVersion !== 2 || product.registryVersion !== "dart-product-registry-v2") {
      throw new Error(`product registry v2가 아닙니다: ${product.productId}`);
    }
    if (product.candidateRcpNos.length === 0) throw new Error(`후보 RCP가 없습니다: ${product.productId}`);
    if (new Set(product.candidateRcpNos).size !== product.candidateRcpNos.length) {
      throw new Error(`상품 안에서 후보 RCP가 중복됐습니다: ${product.productId}`);
    }
    for (const rcpNo of product.candidateRcpNos) {
      if (!/^\d{14}$/.test(rcpNo) || allRcpNos.has(rcpNo)) throw new Error(`후보 RCP가 잘못됐거나 중복됐습니다: ${rcpNo}`);
      allRcpNos.add(rcpNo);
    }
    if (JSON.stringify(product.inventory.map((item) => item.rcpNo)) !== JSON.stringify(product.candidateRcpNos)) {
      throw new Error(`inventory와 후보 RCP가 일치하지 않습니다: ${product.productId}`);
    }
    for (const item of product.inventory) {
      if (item.status === "local") {
        localCount += 1;
        if (item.unavailableReason !== undefined) throw new Error(`local inventory에 unavailable reason이 있습니다: ${item.rcpNo}`);
      } else {
        unavailableCount += 1;
        if (item.rcpNo !== "20250113000307" || item.unavailableReason !== "opendart-014") {
          throw new Error(`source-unavailable 정본이 아닙니다: ${item.rcpNo}`);
        }
      }
    }
    if (new Set(product.approvedFilings.map((item) => item.rcpNo)).size !== product.approvedFilings.length) {
      throw new Error(`승인 공시가 중복됐습니다: ${product.productId}`);
    }
    for (const approved of product.approvedFilings) {
      const inventory = product.inventory.find((item) => item.rcpNo === approved.rcpNo);
      if (!inventory || inventory.status !== "local" || !/^[a-f0-9]{64}$/.test(approved.contentHash) ||
        !/^[a-f0-9]{64}$/.test(approved.locatorSetHash) ||
        !approved.reviewer.trim() || !Number.isFinite(Date.parse(approved.reviewedAt)) ||
        !approved.productMappingEvidence.trim()) {
        throw new Error(`승인 공시 binding이 유효하지 않습니다: ${product.productId}/${approved.rcpNo}`);
      }
    }
    const ready = product.status === "ready-local";
    if (ready !== (product.activeRcpNo !== null)) throw new Error(`active RCP와 상태가 일치하지 않습니다: ${product.productId}`);
    if (product.activeRcpNo !== null && !product.candidateRcpNos.includes(product.activeRcpNo)) {
      throw new Error(`active RCP가 후보 집합에 없습니다: ${product.productId}`);
    }
  }
  if (allRcpNos.size !== 38 || localCount !== 37 || unavailableCount !== 1) {
    throw new Error("onboarding inventory는 후보 38개, local 37개, source-unavailable 1개여야 합니다.");
  }
  return catalog;
};

export const onboardingProduct = (
  categoryId: OnboardingCategory,
  productId: string,
): OnboardingProduct | undefined => validateOnboardingCatalog()
  .find((item) => item.categoryId === categoryId && item.productId === productId);

export const approvedFilingsForProduct = (
  categoryId: OnboardingCategory,
  productId: string,
): readonly ApprovedFilingBindingV1[] => onboardingProduct(categoryId, productId)?.approvedFilings ?? [];

export const isApprovedOnboardingFiling = (
  categoryId: OnboardingCategory,
  productId: string,
  rcpNo: string,
): boolean => approvedFilingsForProduct(categoryId, productId).some((item) => item.rcpNo === rcpNo);

export const activeRcpNoForProduct = (
  categoryId: OnboardingCategory,
  productId: string,
): string | undefined => validateOnboardingCatalog()
  .find((item) => item.categoryId === categoryId && item.productId === productId)
  ?.activeRcpNo ?? undefined;

export const candidateRcpNosForProduct = (
  categoryId: OnboardingCategory,
  productId: string,
): readonly string[] | undefined => validateOnboardingCatalog()
  .find((item) => item.categoryId === categoryId && item.productId === productId)
  ?.candidateRcpNos;

export const isActiveOnboardingProduct = (
  categoryId: OnboardingCategory,
  productId: string,
  rcpNo: string,
): boolean => activeRcpNoForProduct(categoryId, productId) === rcpNo;

const cattleProduct = (offerId: string): OnboardingProduct | undefined =>
  validateOnboardingCatalog().find(
    (item) => item.categoryId === "cattle" && item.productId === offerId,
  );

export const isPublicVerificationScopeAllowed = (offerId: string): boolean => {
  const product = cattleProduct(offerId);
  return product === undefined ||
    (product.status === "ready-local" && product.activeRcpNo !== null);
};

export const isPublicVerificationDocumentAllowed = (
  offerId: string,
  rcpNo: string,
): boolean => {
  const product = cattleProduct(offerId);
  return product === undefined ||
    (product.status === "ready-local" && product.activeRcpNo === rcpNo);
};

export const isExternalAiApprovedOnboardingProduct = (
  categoryId: OnboardingCategory,
  productId: string,
): boolean => validateOnboardingCatalog().some(
  (item) => item.categoryId === categoryId &&
    item.productId === productId &&
    item.status === "ready-local" &&
    item.activeRcpNo !== null &&
    item.externalAiApproved,
);
