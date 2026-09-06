import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";

export const CATALOG_PAGE_SIZE = 9;

export function paginateCatalog<T>(
  items: readonly T[],
  requestedPage: string | string[] | undefined,
) {
  const value = Array.isArray(requestedPage) ? requestedPage[0] : requestedPage;
  const parsed = Number(value);
  const pageCount = Math.max(1, Math.ceil(items.length / CATALOG_PAGE_SIZE));
  const page = Math.min(
    Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1,
    pageCount,
  );
  return {
    page,
    pageCount,
    items: items.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE),
  };
}

export function categoryCatalogHref(
  categoryHref: string,
  searchParams: CategoryPageSearchParams,
  page: number,
) {
  const params = new URLSearchParams({ tab: "analysis" });
  Object.entries(searchParams).forEach(([key, value]) => {
    if (["tab", "page", "verdict"].includes(key)) return;
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== undefined) params.append(key, entry);
    }
  });
  if (page > 1) params.set("page", String(page));
  return `${categoryHref}?${params.toString()}`;
}
