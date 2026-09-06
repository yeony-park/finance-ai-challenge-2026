import { CategoryExplanationPanel } from "./CategoryExplanationPanel";
import {
  CattleCrossCheckDiagramContent,
  AnalysisEvidenceDiagramContent,
} from "@/lib/content/category-methodology";

export function CattleCrossCheckDiagram() {
  return <CategoryExplanationPanel {...CattleCrossCheckDiagramContent} />;
}

export function AnalysisEvidenceDiagram() {
  return <CategoryExplanationPanel {...AnalysisEvidenceDiagramContent} />;
}
