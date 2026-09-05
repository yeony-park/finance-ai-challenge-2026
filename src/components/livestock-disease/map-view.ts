import type {
  LivestockDiseaseMapDataset,
  LivestockDiseaseMapEvent,
  LivestockDiseaseMapSpecies,
} from "@/lib/content/livestock-disease-map";

export interface LivestockDiseaseMapFilter {
  readonly species: LivestockDiseaseMapSpecies;
  readonly focusProvinces: readonly string[];
  readonly throughDate?: string;
  readonly currentYear: string;
}

export interface LivestockDiseaseMapViewEvent
  extends LivestockDiseaseMapEvent {
  readonly viewKey: string;
  readonly isCurrent: boolean;
  readonly isFocus: boolean;
}

export const selectLivestockDiseaseMapEvents = (
  dataset: LivestockDiseaseMapDataset,
  filter: LivestockDiseaseMapFilter,
): readonly LivestockDiseaseMapViewEvent[] => {
  if (dataset.species !== filter.species) return [];

  return dataset.events
    .filter((event) => {
      if (filter.species === "pig") return true;
      return (
        filter.focusProvinces.includes(event.province) &&
        (!filter.throughDate || event.occurredAt <= filter.throughDate)
      );
    })
    .map((event, index) => {
      const isCurrent = event.occurredAt.startsWith(`${filter.currentYear}-`);
      const isFocusProvince = filter.focusProvinces.includes(event.province);

      return {
        ...event,
        viewKey: [
          event.disease,
          event.occurredAt,
          event.region,
          event.latitude,
          event.longitude,
          index,
        ].join(":"),
        isCurrent,
        isFocus:
          filter.species === "cattle"
            ? true
            : isFocusProvince && (event.disease !== "ASF" || isCurrent),
      };
    });
};

export const diseaseYearlyCounts = (
  events: readonly LivestockDiseaseMapViewEvent[],
  species: LivestockDiseaseMapSpecies,
): readonly (readonly [string, number])[] => {
  const countedEvents =
    species === "pig"
      ? events.filter((event) => event.disease === "ASF")
      : events;
  const counts = new Map<string, number>();

  for (const event of countedEvents) {
    const year = event.occurredAt.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
};
