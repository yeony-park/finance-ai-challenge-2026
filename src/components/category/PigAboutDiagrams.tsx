import { CategoryExplanationPanel } from "./CategoryExplanationPanel";
import {
  PigDisclosureOverviewDiagramContent,
  PigAnalysisScopeDiagramContent,
} from "@/lib/content/category-methodology";

export function PigDisclosureOverviewDiagram() {
  return <CategoryExplanationPanel {...PigDisclosureOverviewDiagramContent} />;
}

export function PigAnalysisScopeDiagram() {
  return <CategoryExplanationPanel {...PigAnalysisScopeDiagramContent} />;
}
