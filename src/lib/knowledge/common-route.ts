import type { CommonProductRecord } from "./schema";

export const COMMON_PRODUCT_CATEGORIES = [
  "cattle",
  "pig",
  "art",
  "real-estate",
] as const satisfies readonly CommonProductRecord["categoryId"][];

export const isCommonProductCategory = (
  value: string,
): value is CommonProductRecord["categoryId"] =>
  (COMMON_PRODUCT_CATEGORIES as readonly string[]).includes(value);

export const commonProductHref = (
  categoryId: CommonProductRecord["categoryId"],
  productId: string,
): string => `/offers/common/${categoryId}/${productId}`;

export const commonProductStaticParams = (
  products: readonly Pick<CommonProductRecord, "categoryId" | "productId">[],
): { readonly categoryId: CommonProductRecord["categoryId"]; readonly productId: string }[] =>
  [...new Map(products.map((product) => [
    `${product.categoryId}\0${product.productId}`,
    { categoryId: product.categoryId, productId: product.productId },
  ])).values()];

export const findCommonProduct = (
  products: readonly CommonProductRecord[],
  categoryId: CommonProductRecord["categoryId"],
  productId: string,
): CommonProductRecord | null =>
  products.find(
    (product) => product.categoryId === categoryId && product.productId === productId,
  ) ?? null;
