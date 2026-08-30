#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_kor.geojson";
const LICENSE_URL = "https://www.naturalearthdata.com/about/terms-of-use/";
const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "reference",
  "pig-asf",
  "korea_outline.json",
);
const TOLERANCE_SQUARED = 0.008 ** 2;

const squareDistance = (left, right) => {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  return dx * dx + dy * dy;
};

const squareSegmentDistance = (point, start, end) => {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx !== 0 || dy !== 0) {
    const ratio =
      ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (ratio > 1) {
      x = end[0];
      y = end[1];
    } else if (ratio > 0) {
      x += dx * ratio;
      y += dy * ratio;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
};

const simplifyStep = (points, first, last, simplified) => {
  let maxDistance = TOLERANCE_SQUARED;
  let index = -1;
  for (let cursor = first + 1; cursor < last; cursor += 1) {
    const distance = squareSegmentDistance(points[cursor], points[first], points[last]);
    if (distance > maxDistance) {
      index = cursor;
      maxDistance = distance;
    }
  }
  if (index === -1) return;
  if (index - first > 1) simplifyStep(points, first, index, simplified);
  simplified.push(points[index]);
  if (last - index > 1) simplifyStep(points, index, last, simplified);
};

const simplifyRing = (ring) => {
  const withoutDuplicateEnd =
    ring.length > 1 && squareDistance(ring[0], ring.at(-1)) === 0
      ? ring.slice(0, -1)
      : ring;
  if (withoutDuplicateEnd.length <= 3) return ring;
  const simplified = [withoutDuplicateEnd[0]];
  simplifyStep(withoutDuplicateEnd, 0, withoutDuplicateEnd.length - 1, simplified);
  simplified.push(withoutDuplicateEnd.at(-1));
  simplified.push(simplified[0]);
  return simplified.map(([longitude, latitude]) => [
    Number(longitude.toFixed(5)),
    Number(latitude.toFixed(5)),
  ]);
};

const main = async () => {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "finance-ai-challenge-2026/1.0 (competition map preparation)",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const collection = await response.json();
  const feature = collection.features.find(
    (candidate) => candidate.properties?.ADM0_A3 === "KOR",
  );
  if (!feature || feature.geometry.type !== "MultiPolygon") {
    throw new Error("Natural Earth에서 대한민국 MultiPolygon을 찾지 못했습니다.");
  }
  const polygons = feature.geometry.coordinates.map((polygon) =>
    polygon.map(simplifyRing),
  );
  const output = {
    schemaVersion: 1,
    source: {
      name: "Natural Earth 1:10m Admin 0 — South Korea viewpoint",
      sourceUrl: SOURCE_URL,
      license: "Public domain",
      licenseUrl: LICENSE_URL,
      retrievedAt: new Date().toISOString(),
    },
    bbox: feature.bbox,
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`대한민국 경계 ${polygons.length}개 폴리곤 저장 완료`);
};

main().catch((error) => {
  console.error("대한민국 경계 수집 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
