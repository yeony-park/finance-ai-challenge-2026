import { CategoryExplanationPanel } from "./CategoryExplanationPanel";
import {
  RealEstateVerificationOverviewDiagramContent,
  RealEstateAnalysisScopeDiagramContent,
} from "@/lib/content/category-methodology";

export function RealEstateVerificationOverviewDiagram() {
  return <CategoryExplanationPanel {...RealEstateVerificationOverviewDiagramContent} />;
}

export function RealEstateAnalysisScopeDiagram() {
  return <CategoryExplanationPanel {...RealEstateAnalysisScopeDiagramContent} />;
}
