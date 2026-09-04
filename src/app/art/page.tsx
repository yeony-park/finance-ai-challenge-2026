import type { Metadata } from "next";

import { SyntheticArtCatalog } from "@/components/art/synthetic/SyntheticArtCatalog";
import {
  ArtAnalysisScopeDiagram,
  ArtDisclosureOverviewDiagram,
} from "@/components/category/ArtAboutDiagrams";
import { CategoryAnalysisWorkspace } from "@/components/category/CategoryAnalysisWorkspace";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import home from "@/components/home/home.module.css";
import { categoryById } from "@/lib/content/categories";
import {
  categoryPageStateFromSearchParams,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import {
  ART_PAGE_DESCRIPTION,
  ART_PAGE_LEAD,
} from "@/lib/content/art";

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
  const { activeTab } = categoryPageStateFromSearchParams(params);

  if (activeTab === "analysis") {
    return (
      <div className={`${home.section} ${shell.analysisSection}`}>
        <CategoryAnalysisWorkspace
          categoryId="art"
          categoryHref={INFO.href}
          title={INFO.label}
          selectedPhase={null}
          showStatusTabs={false}
        >
          <SyntheticArtCatalog searchParams={params} />
        </CategoryAnalysisWorkspace>
      </div>
    );
  }

  return (
    <CategoryLanding
      categoryId="art"
      activeTab={activeTab}
      title={INFO.label}
      lead={ART_PAGE_LEAD}
      descriptor={null}
      heroImage="/category-art.jpg"
      leadVisual={<ArtDisclosureOverviewDiagram />}
      analysisHintVisual={<ArtAnalysisScopeDiagram />}
      replaceCopyWithVisuals
      offers={[]}
      preview={INFO.preview}
    />
  );
}
