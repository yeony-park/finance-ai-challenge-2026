import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

export const METHODOLOGY_TAB_COPY = [
  { id: "methodology-common", label: "공통", anchors: Object.values(METHODOLOGY_ANCHOR) },
  { id: "methodology-art", label: "미술품", anchors: ["미술품-layers"] },
  { id: "methodology-cattle", label: "한우", anchors: ["한우-description-content", "한우-layers"] },
  { id: "methodology-pig", label: "한돈", anchors: ["한돈-description-content", "한돈-layers"] },
  { id: "methodology-real-estate", label: "부동산", anchors: ["부동산-layers"] },
] as const;

export type MethodologyTabId = (typeof METHODOLOGY_TAB_COPY)[number]["id"];

export function methodologyTabFromHash(hash: string): MethodologyTabId | null {
  let anchor: string;
  try {
    anchor = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
  return METHODOLOGY_TAB_COPY.find(
    (tab) => tab.id === anchor || (tab.anchors as readonly string[]).includes(anchor),
  )?.id ?? null;
}
