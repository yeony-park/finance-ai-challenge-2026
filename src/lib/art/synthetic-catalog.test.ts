import { describe, expect, it } from "vitest";

import {
  listSyntheticArtCurrentProducts,
  listSyntheticArtHistoricalProducts,
  listSyntheticArtKnowledge,
  loadSyntheticArtDataset,
  SYNTHETIC_ART_SCENARIO_ID,
} from "./synthetic-catalog";

describe("synthetic art catalog", () => {
  it("validates and joins the canonical synthetic dataset", async () => {
    const [dataset, current, historical] = await Promise.all([
      loadSyntheticArtDataset(),
      listSyntheticArtCurrentProducts(),
      listSyntheticArtHistoricalProducts(),
    ]);

    expect(dataset.dataMode).toBe("synthetic");
    expect(current).toHaveLength(9);
    expect(historical).toHaveLength(318);
    expect(current.every((item) =>
      item.offering.unitPrice !== null &&
      item.offering.numberOfUnits !== null &&
      item.offering.unitPrice * item.offering.numberOfUnits === item.offering.totalOfferingAmount
    )).toBe(true);
    expect(historical.every((item) => item.record.artworkImageUrl?.startsWith("/synthetic-art/history/"))).toBe(true);
  });

  it("derives three externally eligible RAG chunks for every current product", async () => {
    const results = await listSyntheticArtKnowledge();

    expect(results).toHaveLength(9);
    expect(results.flatMap((item) => item.knowledge.documents)).toHaveLength(9);
    expect(results.flatMap((item) => item.knowledge.chunks)).toHaveLength(27);
    expect(results.every(({ product, knowledge }) =>
      knowledge.chunks.every((chunk) =>
        chunk.categoryId === "art" &&
        chunk.productId === product.offering.id &&
        chunk.scenarioId === SYNTHETIC_ART_SCENARIO_ID &&
        chunk.dataNature === "scenario" &&
        chunk.approvedForExternalAi &&
        chunk.piiReviewStatus === "passed"
      )
    )).toBe(true);
  });
});
