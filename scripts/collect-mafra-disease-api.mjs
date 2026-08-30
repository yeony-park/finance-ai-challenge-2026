#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "reference", "livestock-disease", "api");
const BASE_URL = "http://211.237.50.150:7080/openapi";
const OCCURRENCE_API_URL = "Grid_20151204000000000316_1";
const FARM_STATS_API_URL = "Grid_20220823000000000636_1";
const OCCURRENCE_DOC_URL =
  "https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20151204000000000563";
const FARM_STATS_DOC_URL =
  "https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20220823000000002326";
const PAGE_SIZE = 1000;
const MAX_FILTERED_ROWS = 5000;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const callApi = async ({ apiKey, apiUrl, start, end, filters = {} }) => {
  const url = new URL(
    `${BASE_URL}/${encodeURIComponent(apiKey)}/json/${apiUrl}/${start}/${end}`,
  );
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const body = await response.json();
  const root = body[apiUrl];
  if (!root) throw new Error(`${apiUrl} 응답 루트를 찾지 못했습니다.`);
  const code = root.result?.code ?? root.RESULT?.CODE;
  if (code && code !== "INFO-000") {
    throw new Error(`${code}: ${root.result?.message ?? root.RESULT?.MESSAGE ?? "API 오류"}`);
  }
  return {
    totalCount: Number(root.totalCnt ?? root.TOTAL_COUNT ?? 0),
    rows: asArray(root.row),
  };
};

const fetchFilteredRows = async ({
  apiKey,
  apiUrl,
  filters,
  maxRows = MAX_FILTERED_ROWS,
}) => {
  const first = await callApi({
    apiKey,
    apiUrl,
    start: 1,
    end: PAGE_SIZE,
    filters,
  });
  if (first.totalCount > maxRows) {
    throw new Error(
      `${apiUrl} 필터 결과 ${first.totalCount}건은 안전 상한 ${maxRows}건을 넘습니다.`,
    );
  }
  const rows = [...first.rows];
  for (let start = PAGE_SIZE + 1; start <= first.totalCount; start += PAGE_SIZE) {
    const page = await callApi({
      apiKey,
      apiUrl,
      start,
      end: Math.min(start + PAGE_SIZE - 1, first.totalCount),
      filters,
    });
    rows.push(...page.rows);
  }
  return rows;
};

const PROVINCES = new Map([
  ["서울특별시", "서울"], ["서울", "서울"],
  ["부산광역시", "부산"], ["부산", "부산"],
  ["대구광역시", "대구"], ["대구", "대구"],
  ["인천광역시", "인천"], ["인천", "인천"],
  ["광주광역시", "광주"], ["광주", "광주"],
  ["대전광역시", "대전"], ["대전", "대전"],
  ["울산광역시", "울산"], ["울산", "울산"],
  ["세종특별자치시", "세종"], ["세종", "세종"],
  ["경기도", "경기"], ["경기", "경기"],
  ["강원특별자치도", "강원"], ["강원도", "강원"], ["강원", "강원"],
  ["충청북도", "충북"], ["충북", "충북"],
  ["충청남도", "충남"], ["충남", "충남"],
  ["전북특별자치도", "전북"], ["전라북도", "전북"], ["전북", "전북"],
  ["전라남도", "전남"], ["전남", "전남"],
  ["경상북도", "경북"], ["경북", "경북"],
  ["경상남도", "경남"], ["경남", "경남"],
  ["제주특별자치도", "제주"], ["제주", "제주"],
]);

const normalizeSpecies = (value = "") => {
  if (/돼지/u.test(value)) return "pig";
  if (/염소/u.test(value)) return "goat";
  if (/(?:한우|육우|젖소|소)/u.test(value)) return "cattle";
  return "other";
};

const parseRegion = (value = "") => {
  const parts = value.trim().split(/\s+/);
  const province = PROVINCES.get(parts[0]);
  if (!province || !parts[1]) return null;
  if (province === "세종") {
    return { province, cityCounty: "세종시", region: "세종" };
  }
  return {
    province,
    cityCounty: parts[1],
    region: `${province} ${parts[1]}`,
  };
};

const normalizeDate = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const sanitizeOccurrence = (row) => {
  const location = parseRegion(row.FARM_LOCPLC);
  const occurredAt = normalizeDate(row.OCCRRNC_DE);
  if (!location || !occurredAt) return null;
  return {
    id: `mafra-api-${sha256(String(row.ICTSD_OCCRRNC_NO ?? "")).slice(0, 12)}`,
    disease: String(row.LKNTS_NM ?? "").trim(),
    occurredAt,
    species: normalizeSpecies(row.LVSTCKSPC_NM),
    affectedHeadCount: Number(row.OCCRRNC_LVSTCKCNT) || null,
    ...location,
    endedAt: normalizeDate(row.CESSATION_DE),
  };
};

const sanitizeFarmStat = (row) => {
  const province = PROVINCES.get(String(row.CTPRVN_NM ?? "").trim());
  if (!province) return null;
  return {
    disease: String(row.FARM_DISEASE_NM ?? "").trim(),
    species: normalizeSpecies(row.LVSTCK_NM),
    province,
    cityCounty: String(row.SIGUNGU_NM ?? "").trim(),
    farmCount: Number(row.FARM_CO) || 0,
  };
};

const dayDifference = (left, right) =>
  Math.abs(
    Math.round(
      (Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) /
        86_400_000,
    ),
  );

const compareCanonical = (canonical, auxiliary) => {
  const unused = new Set(auxiliary.map((_, index) => index));
  let matchedCanonicalCount = 0;
  for (const event of canonical) {
    const matchIndex = auxiliary.findIndex(
      (candidate, index) =>
        unused.has(index) &&
        candidate.species === event.species &&
        candidate.province === event.province &&
        candidate.cityCounty === event.cityCounty &&
        dayDifference(candidate.occurredAt, event.occurredAt) <= 1,
    );
    if (matchIndex < 0) continue;
    unused.delete(matchIndex);
    matchedCanonicalCount += 1;
  }
  return {
    canonicalCount: canonical.length,
    auxiliaryCount: auxiliary.length,
    matchedCanonicalCount,
    unmatchedCanonicalCount: canonical.length - matchedCanonicalCount,
    auxiliaryOnlyCount: unused.size,
    dateToleranceDays: 1,
  };
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const main = async () => {
  const apiKey = process.env.MAFRA_API_KEY;
  if (!apiKey) throw new Error("MAFRA_API_KEY가 없습니다.");
  await mkdir(OUT_DIR, { recursive: true });
  const collectedAt = new Date().toISOString();

  const targetDiseases = ["구제역", "아프리카돼지열병", "럼피스킨병"];
  const occurrenceGroups = [];
  for (const disease of targetDiseases) {
    const rows = await fetchFilteredRows({
      apiKey,
      apiUrl: OCCURRENCE_API_URL,
      filters: { LKNTS_NM: disease },
    });
    const events = rows
      .map(sanitizeOccurrence)
      .filter(Boolean)
      .filter((event) => event.disease === disease)
      .sort(
        (left, right) =>
          left.occurredAt.localeCompare(right.occurredAt) ||
          left.region.localeCompare(right.region, "ko"),
      );
    occurrenceGroups.push({ disease, events });
  }

  const fmdCanonical = await readJson(
    path.join(ROOT, "data", "reference", "livestock-disease", "fmd", "mafra_fmd_events.json"),
  );
  const asfCanonical = await readJson(
    path.join(ROOT, "data", "reference", "pig-asf", "mafra_asf_events.json"),
  );
  const fmdAuxiliary = occurrenceGroups
    .find((group) => group.disease === "구제역")
    .events.filter((event) => event.occurredAt >= fmdCanonical.coverage.firstOccurredAt);
  const asfAuxiliary = occurrenceGroups
    .find((group) => group.disease === "아프리카돼지열병")
    .events.filter((event) => event.occurredAt >= asfCanonical.coverage.firstOccurredAt);

  const occurrenceSnapshot = {
    schemaVersion: 1,
    role: "auxiliary",
    collectedAt,
    source: {
      name: "농림축산검역본부 가축 질병 발생 정보 API",
      documentationUrl: OCCURRENCE_DOC_URL,
      service: OCCURRENCE_API_URL,
    },
    privacy: {
      excludedFields: ["FARM_NM", "FARM_LOCPLC_LEGALDONG_CODE", "상세 FARM_LOCPLC"],
      retainedLocationPrecision: "시도·시군구",
      rawResponsePersisted: false,
    },
    comparison: {
      fmd: compareCanonical(fmdCanonical.events, fmdAuxiliary),
      asf: compareCanonical(asfCanonical.events, asfAuxiliary),
      policy:
        "농식품부 게시 첨부와 공식 지도를 정본으로 유지하고 API는 축종·날짜·시군구 교차검증에만 사용함.",
    },
    diseases: occurrenceGroups.map(({ disease, events }) => ({
      disease,
      eventCount: events.length,
      firstOccurredAt: events.at(0)?.occurredAt ?? null,
      lastOccurredAt: events.at(-1)?.occurredAt ?? null,
      events,
    })),
  };

  let farmStatsSnapshot;
  try {
    const rows = await fetchFilteredRows({
      apiKey,
      apiUrl: FARM_STATS_API_URL,
      filters: {},
      maxRows: 30_000,
    });
    const stats = rows
      .map(sanitizeFarmStat)
      .filter(Boolean)
      .filter((stat) => targetDiseases.includes(stat.disease));
    const grouped = new Map();
    for (const stat of stats) {
      const key = `${stat.disease}|${stat.species}|${stat.province}`;
      const current = grouped.get(key) ?? {
        disease: stat.disease,
        species: stat.species,
        province: stat.province,
        farmCount: 0,
        municipalities: new Set(),
      };
      current.farmCount += stat.farmCount;
      if (stat.cityCounty) current.municipalities.add(stat.cityCounty);
      grouped.set(key, current);
    }
    const aggregatedStats = [...grouped.values()].map((stat) => ({
      disease: stat.disease,
      species: stat.species,
      province: stat.province,
      farmCount: stat.farmCount,
      municipalityCount: stat.municipalities.size,
    }));
    farmStatsSnapshot = {
      schemaVersion: 1,
      role: "auxiliary",
      collectedAt,
      source: {
        name: "농림축산식품부 대상질병별 농장 통계 API",
        documentationUrl: FARM_STATS_DOC_URL,
        service: FARM_STATS_API_URL,
      },
      note:
        "발생 건수가 아니라 대상질병별 농장 현황이므로 지도 핀에는 사용하지 않고 지역 노출도 참고에만 사용함.",
      rawRowCount: rows.length,
      processing:
        "읍면동 행을 저장하지 않고 질병·축종·시도 단위로 합산함. 발생 건수가 아닌 대상 농장 통계임.",
      stats: aggregatedStats,
    };
  } catch (error) {
    farmStatsSnapshot = {
      schemaVersion: 1,
      role: "auxiliary",
      collectedAt,
      source: {
        name: "농림축산식품부 대상질병별 농장 통계 API",
        documentationUrl: FARM_STATS_DOC_URL,
        service: FARM_STATS_API_URL,
      },
      status: "unavailable",
      reason: error instanceof Error ? error.message : String(error),
      stats: [],
    };
  }

  await writeFile(
    path.join(OUT_DIR, "mafra_disease_occurrences_auxiliary.json"),
    `${JSON.stringify(occurrenceSnapshot, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(OUT_DIR, "mafra_farm_disease_stats_auxiliary.json"),
    `${JSON.stringify(farmStatsSnapshot, null, 2)}\n`,
    "utf8",
  );

  console.log(
    occurrenceGroups.map((group) => `${group.disease} ${group.events.length}건`).join(" · "),
  );
  console.log(
    `보조 대조 완료: FMD ${occurrenceSnapshot.comparison.fmd.matchedCanonicalCount}/${occurrenceSnapshot.comparison.fmd.canonicalCount} · ASF ${occurrenceSnapshot.comparison.asf.matchedCanonicalCount}/${occurrenceSnapshot.comparison.asf.canonicalCount}`,
  );
};

main().catch((error) => {
  console.error("MAFRA 질병 API 수집 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
