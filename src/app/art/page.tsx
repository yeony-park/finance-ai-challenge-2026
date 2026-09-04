import type { Metadata } from "next";

import { SyntheticArtCatalog } from "@/components/art/synthetic/SyntheticArtCatalog";
import { SyntheticArtStatusTabs } from "@/components/art/synthetic/SyntheticArtStatusTabs";
import { CategoryAnalysisWorkspace } from "@/components/category/CategoryAnalysisWorkspace";
import home from "@/components/home/home.module.css";
import { categoryById } from "@/lib/content/categories";
import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";
import { ART_PAGE_DESCRIPTION } from "@/lib/content/art";

import shell from "@/components/category/category-shell.module.css";

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
  return (
    <div className={`${home.section} ${shell.analysisSection}`}>
      <CategoryAnalysisWorkspace
        categoryId="art"
        categoryHref={INFO.href}
        title={INFO.label}
        selectedPhase={null}
        showStatusTabs={false}
        analysisControls={<SyntheticArtStatusTabs searchParams={params} />}
        headerClassName={shell.analysisHeaderSticky}
      >
        <SyntheticArtCatalog searchParams={params} />
      </CategoryAnalysisWorkspace>
    </div>
  );
}
