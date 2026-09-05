import { describe, expect, test } from "vitest";

import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
} from "@/lib/content/livestock-disease";

import { GET } from "./route";

const publicCache =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

describe("GET /api/livestock-disease-map", () => {
  test("returns the cattle map dataset with public cache headers", async () => {
    const response = GET(
      new Request("http://localhost/api/livestock-disease-map?species=cattle"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(publicCache);
    expect(response.headers.get("etag")).toContain("livestock-disease-cattle-");
    expect(body.species).toBe("cattle");
    expect(body.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.events).toHaveLength(
      CATTLE_FMD_EVENTS.length + CATTLE_LSD_EVENTS.length,
    );
    expect(Object.keys(body.events[0])).not.toContain("source");
    expect(JSON.stringify(body)).not.toContain("sourceUrl");
    expect(JSON.stringify(body)).not.toContain("headCount");
  });

  test.each([
    "",
    "?species=",
    "?species=goat",
    "?species=CATTLE",
    "?species=cattle&unknown=value",
    "?species=cattle&species=pig",
  ])("rejects invalid query %s with 400 and no-store", async (query) => {
    const response = GET(
      new Request(`http://localhost/api/livestock-disease-map${query}`),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "validation_error",
      message: "species는 cattle 또는 pig여야 합니다.",
    });
  });
});
