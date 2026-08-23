export const METHODOLOGY_ANCHOR = {
  methodology: "methodology-title",
  pipeline: "pipeline-title",
  layers: "layers-title",
  sources: "sources-title",
  verdicts: "verdicts-title",
  amendment: "amendment-title",
  principles: "principles-title",
  limits: "limits-title",
  artAnalysisDemo: "art-analysis-demo",
} as const;

export type MethodologyAnchor =
  (typeof METHODOLOGY_ANCHOR)[keyof typeof METHODOLOGY_ANCHOR];
