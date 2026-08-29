import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  CommonProductDetail,
  commonProductMetadata,
} from "@/components/knowledge/CommonProductDetail";
import {
  loadApprovedCommonProducts,
  loadCommonKnowledgeScope,
} from "@/lib/knowledge/loader";
import {
  commonProductStaticParams,
  findCommonProduct,
  isCommonProductCategory,
} from "@/lib/knowledge/common-route";

interface CommonProductPageProps {
  readonly params: Promise<{
    readonly categoryId: string;
    readonly productId: string;
  }>;
}

const loadProducts = cache(loadApprovedCommonProducts);

const loadProduct = cache(async (categoryId: string, productId: string) => {
  if (!isCommonProductCategory(categoryId)) return null;
  return findCommonProduct(await loadProducts(), categoryId, productId);
});

const loadScope = cache(async (categoryId: string, productId: string) => {
  const product = await loadProduct(categoryId, productId);
  return product
    ? loadCommonKnowledgeScope(product.categoryId, product.productId, product.dataNature)
    : null;
});

export async function generateStaticParams() {
  return commonProductStaticParams(await loadProducts());
}

export const dynamicParams = false;

export async function generateMetadata({ params }: CommonProductPageProps): Promise<Metadata> {
  const { categoryId, productId } = await params;
  const product = await loadProduct(categoryId, productId);
  return product
    ? commonProductMetadata(product)
    : {
        title: "상품을 찾을 수 없습니다",
        robots: { index: false, follow: false },
      };
}

export default async function CommonProductPage({ params }: CommonProductPageProps) {
  const { categoryId, productId } = await params;
  const scope = await loadScope(categoryId, productId);
  if (!scope?.product) notFound();
  return <CommonProductDetail scope={scope} />;
}
