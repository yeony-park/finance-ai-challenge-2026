import type { AssetKind, ClaimKind } from "../types";

export type CategoryId = "cattle" | "pig" | "art" | "real-estate";

export type VerificationLayer = "existence" | "price" | "performance";

export type LayerSupportLevel = "supported" | "partial" | "unsupported";

export const LAYER_LABELS: Readonly<Record<VerificationLayer, string>> = {
  existence: "실재성",
  price: "가격",
  performance: "이행",
};

export const LAYER_SUPPORT_LABELS: Readonly<Record<LayerSupportLevel, string>> =
  {
    supported: "검증 지원",
    partial: "부분 지원",
    unsupported: "검증 경로 없음",
  };

export interface LayerSupportDeclaration {
  readonly layer: VerificationLayer;
  readonly level: LayerSupportLevel;
  readonly basis: string;
  readonly publicSourceIds: readonly string[];
}

export type AdapterStatus = "implemented" | "planned";

export interface AdapterBinding {
  readonly sourceId: string;
  readonly moduleName: string;
  readonly status: AdapterStatus;
  readonly hasFakeTwin: true;
}

export type SourceLicense = "green" | "yellow" | "red";

export interface ProposedSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly note: string;
  readonly license: SourceLicense;
  readonly amendsExisting?: boolean;
}

export interface PublicNameAllowance {
  readonly name: string;
  readonly basis: string;
}

export type PageSectionSlot =
  | "layer-declaration"
  | "verdict-summary"
  | "evidence-table"
  | "event-timeline"
  | "review-questions"
  | "custom";

export const REQUIRED_PAGE_SLOTS: readonly PageSectionSlot[] = [
  "layer-declaration",
  "verdict-summary",
  "evidence-table",
  "event-timeline",
  "review-questions",
];

export interface ProposedClaimKind {
  readonly id: string;
  readonly meaning: string;
  readonly unit?: string;
  readonly verificationMethod: string;
}

export interface CategoryDescriptor {
  readonly id: CategoryId;
  readonly label: string;
  readonly owner: string;
  readonly engineAssetKind?: AssetKind;
  readonly adapters: readonly AdapterBinding[];
  readonly claimKinds: readonly ClaimKind[];
  readonly proposedClaimKinds: readonly ProposedClaimKind[];
  readonly proposedSources: readonly ProposedSource[];
  readonly allowedPublicNames: readonly PublicNameAllowance[];
  readonly layers: readonly LayerSupportDeclaration[];
  readonly freshnessNote: string;
}

const ALL_LAYERS: readonly VerificationLayer[] = [
  "existence",
  "price",
  "performance",
];

export const declaresAllLayers = (
  descriptor: CategoryDescriptor,
): boolean => {
  const declared = new Set(descriptor.layers.map((entry) => entry.layer));
  return ALL_LAYERS.every((layer) => declared.has(layer));
};

export const unknownSourceIds = (
  descriptor: CategoryDescriptor,
  isRegistered: (id: string) => boolean,
): readonly string[] => {
  const proposed = new Set(descriptor.proposedSources.map((s) => s.id));
  const cited = [
    ...descriptor.adapters.map((a) => a.sourceId),
    ...descriptor.layers.flatMap((l) => l.publicSourceIds),
  ];
  return [...new Set(cited)].filter(
    (id) => !isRegistered(id) && !proposed.has(id),
  );
};

export const layerSourcesSatisfied = (
  descriptor: CategoryDescriptor,
): boolean =>
  descriptor.layers.every(
    (layer) =>
      layer.level === "unsupported" || layer.publicSourceIds.length > 0,
  );
