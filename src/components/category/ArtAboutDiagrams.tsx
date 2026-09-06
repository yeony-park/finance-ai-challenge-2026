import { CategoryExplanationPanel } from "./CategoryExplanationPanel";
import {
  ArtDisclosureOverviewDiagramContent,
  ArtAnalysisScopeDiagramContent,
} from "@/lib/content/category-methodology";

export function ArtDisclosureOverviewDiagram() {
  return <CategoryExplanationPanel {...ArtDisclosureOverviewDiagramContent} />;
}

export function ArtAnalysisScopeDiagram() {
  return <CategoryExplanationPanel {...ArtAnalysisScopeDiagramContent} />;
}
