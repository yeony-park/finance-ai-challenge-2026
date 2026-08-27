import type { Metadata } from "next";

import { ArtFactsSection } from "@/components/art/ArtFactsSection";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { categoryById } from "@/lib/content/categories";
import { categoryTabFromSearchParam } from "@/lib/content/category-tabs";
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
  readonly searchParams: Promise<{ readonly tab?: string | string[] }>;
}

export default async function ArtPage({ searchParams }: ArtPageProps) {
  const activeTab = categoryTabFromSearchParam((await searchParams).tab);

  return (
    <CategoryLanding
      categoryId="art"
      activeTab={activeTab}
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
