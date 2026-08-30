import type { Metadata } from "next";

import { ArtFactsSection } from "@/components/art/ArtFactsSection";
import {
  ArtAnalysisScopeDiagram,
  ArtDisclosureOverviewDiagram,
} from "@/components/category/ArtAboutDiagrams";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { categoryById } from "@/lib/content/categories";
import {
  categoryPageStateFromSearchParams,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import {
  ART_CUSTOM_TITLE,
  ART_PAGE_DESCRIPTION,
  ART_PAGE_LEAD,
} from "@/lib/content/art";
import { listArtProducts } from "@/lib/art/product-repository";

const INFO = categoryById("art");

export const metadata: Metadata = {
  title: INFO.label,
  description: ART_PAGE_DESCRIPTION,
};

interface ArtPageProps {
  readonly searchParams: Promise<CategoryPageSearchParams>;
}

export default async function ArtPage({ searchParams }: ArtPageProps) {
  const params = await searchParams;
  const { activeTab, analysisStatus, analysisVerdict } =
    categoryPageStateFromSearchParams(params);
  const products = activeTab === "analysis" ? await listArtProducts() : [];
  const requestedProductId = Array.isArray(params.product)
    ? params.product[0]
    : params.product;
  const initialProductId =
    products.find((product) => product.id === requestedProductId)?.id ??
    products[0]?.id ??
    "";

  return (
    <CategoryLanding
      categoryId="art"
      activeTab={activeTab}
      analysisStatus={analysisStatus}
      analysisVerdict={analysisVerdict}
      title={INFO.label}
      lead={ART_PAGE_LEAD}
      descriptor={null}
      heroImage="/category-art.jpg"
      leadVisual={<ArtDisclosureOverviewDiagram />}
      analysisHintVisual={<ArtAnalysisScopeDiagram />}
      replaceCopyWithVisuals
      offers={[]}
      preview={INFO.preview}
      custom={
        <ArtFactsSection
          products={products}
          initialProductId={initialProductId}
        />
      }
      customTitle={ART_CUSTOM_TITLE}
    />
  );
}
