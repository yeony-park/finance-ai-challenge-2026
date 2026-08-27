import type { Metadata } from "next";

import { ArtFactsSection } from "@/components/art/ArtFactsSection";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { categoryById } from "@/lib/content/categories";
import {
  analysisStatusFromSearchParam,
  categoryTabFromSearchParam,
} from "@/lib/content/category-tabs";
import {
  ART_CUSTOM_TITLE,
  ART_PAGE_DESCRIPTION,
  ART_PAGE_LEAD,
} from "@/lib/content/art";

const INFO = categoryById("art");

export const metadata: Metadata = {
  title: INFO.label,
  description: ART_PAGE_DESCRIPTION,
};

interface ArtPageProps {
  readonly searchParams: Promise<{
    readonly tab?: string | string[];
    readonly status?: string | string[];
  }>;
}

export default async function ArtPage({ searchParams }: ArtPageProps) {
  const params = await searchParams;
  const activeTab = categoryTabFromSearchParam(params.tab);

  return (
    <CategoryLanding
      categoryId="art"
      activeTab={activeTab}
      analysisStatus={analysisStatusFromSearchParam(params.status)}
      title={INFO.label}
      lead={ART_PAGE_LEAD}
      descriptor={null}
      heroImage="/category-art.jpg"
      offers={[]}
      preview={INFO.preview}
      custom={<ArtFactsSection />}
      customTitle={ART_CUSTOM_TITLE}
    />
  );
}
