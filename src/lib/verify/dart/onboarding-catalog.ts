export type OnboardingCategory = "cattle" | "pig";
export type OnboardingStatus = "ready-local" | "needs-role-review";

export interface OnboardingProduct {
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly candidateRcpNos: readonly string[];
  readonly activeRcpNo: string | null;
  readonly status: OnboardingStatus;
  readonly externalAiApproved: false;
}

export const ONBOARDING_CATALOG = [
  { categoryId: "cattle", productId: "livestock-1", candidateRcpNos: ["20240220002223", "20240503000803", "20240528000156", "20240618000419", "20240619000091"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-2", candidateRcpNos: ["20240821000374", "20240911000124"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-3", candidateRcpNos: ["20241202000302", "20241220000182", "20250113000307"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-4", candidateRcpNos: ["20250310000915", "20250331004328", "20250421000094"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-5", candidateRcpNos: ["20250508000518", "20250526000153", "20250617000216"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-6", candidateRcpNos: ["20251010000109", "20251031000477"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-7", candidateRcpNos: ["20260203000427", "20260210000785", "20260225002022"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-8", candidateRcpNos: ["20260326001272", "20260414002068"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "cattle", productId: "livestock-9", candidateRcpNos: ["20260806000159", "20260814003572"], activeRcpNo: "20260814003572", status: "ready-local", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-1", candidateRcpNos: ["20251215000259", "20260107000209", "20260129000008", "20260213000150"], activeRcpNo: "20251215000259", status: "ready-local", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-2", candidateRcpNos: ["20260420000157", "20260506000437", "20260514000004", "20260528001031"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
  { categoryId: "pig", productId: "pig-3", candidateRcpNos: ["20260605000175", "20260624000508", "20260626000400", "20260714000008"], activeRcpNo: null, status: "needs-role-review", externalAiApproved: false },
] as const satisfies readonly OnboardingProduct[];

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
  for (const product of catalog) {
    if (product.candidateRcpNos.length === 0) throw new Error(`후보 RCP가 없습니다: ${product.productId}`);
    if (new Set(product.candidateRcpNos).size !== product.candidateRcpNos.length) {
      throw new Error(`상품 안에서 후보 RCP가 중복됐습니다: ${product.productId}`);
    }
    for (const rcpNo of product.candidateRcpNos) {
      if (!/^\d{14}$/.test(rcpNo) || allRcpNos.has(rcpNo)) throw new Error(`후보 RCP가 잘못됐거나 중복됐습니다: ${rcpNo}`);
      allRcpNos.add(rcpNo);
    }
    const ready = product.status === "ready-local";
    if (ready !== (product.activeRcpNo !== null)) throw new Error(`active RCP와 상태가 일치하지 않습니다: ${product.productId}`);
    if (product.activeRcpNo !== null && !product.candidateRcpNos.includes(product.activeRcpNo)) {
      throw new Error(`active RCP가 후보 집합에 없습니다: ${product.productId}`);
    }
  }
  return catalog;
};

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
