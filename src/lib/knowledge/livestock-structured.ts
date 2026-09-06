import { createHash } from "node:crypto";

import { getRuntimeDb } from "@/lib/db/client";
import { storageMode } from "@/lib/db/env";
import {
  buildCattleAuctionRows,
  buildLivestockDiseaseRows,
  buildPigAuctionRows,
} from "@/lib/db/ingest/build";
import { loadManifestIndex } from "@/lib/db/ingest/manifest";
import type {
  CattleAuctionRow,
  LivestockDiseaseRow,
  PigAuctionRow,
} from "@/lib/db/ingest/records";
import { sourceMetaSchema } from "@/lib/db/records";
import {
  cattleAuctionPrices,
  livestockDiseaseEvents,
  pigAuctionPrices,
} from "@/lib/db/schema";
import { AUCTION_SOURCE_NAME } from "@/lib/verify/adapters/auction-price";
import {
  PIG_AUCTION_FILE_ENDPOINT,
  PIG_AUCTION_SOURCE_NAME,
} from "@/lib/verify/adapters/pig-auction-price";

import type { LivestockStructuredQuery } from "./product-copilot-routing";

const CATTLE_SOURCE_URL = "https://www.data.go.kr/data/15058822/openapi.do";
const DISEASE_LABEL = { ASF: "아프리카돼지열병", FMD: "구제역", LSD: "럼피스킨" } as const;
const SEX_LABEL: Readonly<Record<string, string>> = {
  "025001": "암",
  "025002": "수",
  "025003": "거세",
};
const GRADE_LABEL: Readonly<Record<string, string>> = {
  "0": "1++",
  "1": "1+",
  "2": "1",
  "3": "2",
  "4": "3",
};

export interface LivestockStructuredEvidence {
  readonly kind: "price" | "disease";
  readonly sourceId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly excerpt: string;
  readonly rowCount: number;
  readonly limitations: readonly string[];
}

export interface LivestockStructuredData {
  readonly cattle: readonly CattleAuctionRow[];
  readonly pig: readonly PigAuctionRow[];
  readonly disease: readonly LivestockDiseaseRow[];
}

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const dateOf = (value: string): string => value.slice(0, 10);
const latestDate = (rows: readonly { readonly sourceMeta: { readonly retrievedAt: string } }[]): string =>
  rows.map((row) => dateOf(row.sourceMeta.retrievedAt)).sort().at(-1) ?? "1970-01-01";

const scopedMonths = (
  values: readonly string[],
  query: Extract<LivestockStructuredQuery, { kind: "price" }>,
): readonly string[] => {
  const months = [...new Set(values)].sort().filter((month) =>
    (!query.fromMonth || month >= query.fromMonth) &&
    (!query.toMonth || month <= query.toMonth),
  );
  if (query.fromMonth || query.toMonth) return months;
  return months.slice(-(query.mode === "trend" ? 6 : 1));
};

const movement = (label: string, values: readonly { month: string; price: number }[]): string => {
  if (values.length < 2) return "";
  const first = values[0]!;
  const last = values.at(-1)!;
  const difference = last.price - first.price;
  const direction = difference > 0 ? "상승" : difference < 0 ? "하락" : "변동 없음";
  return ` ${label}은 ${first.month} 대비 ${last.month}에 ${Math.abs(difference).toLocaleString("ko-KR")}원/kg ${direction}했습니다.`;
};

const cattlePriceEvidence = (
  rows: readonly CattleAuctionRow[],
  query: Extract<LivestockStructuredQuery, { kind: "price" }>,
): LivestockStructuredEvidence[] => {
  const months = scopedMonths(rows.map((row) => row.month), query);
  const selected = rows.filter((row) =>
    months.includes(row.month) &&
    (!query.sex || SEX_LABEL[row.sexCd] === query.sex) &&
    (!query.grade || GRADE_LABEL[row.gradeCd] === query.grade),
  );
  const points = query.grade
    ? selected.filter((row) => row.pricePerKg !== null).map((row) => ({
        month: row.month,
        label: `${SEX_LABEL[row.sexCd] ?? row.sexCd} ${GRADE_LABEL[row.gradeCd] ?? row.gradeCd}등급`,
        price: row.pricePerKg!,
        count: row.headCount,
      }))
    : [...new Map(selected.filter((row) => row.avgPricePerKg !== null).map((row) => [
        `${row.month}:${row.sexCd}`,
        {
          month: row.month,
          label: `${SEX_LABEL[row.sexCd] ?? row.sexCd} 평균`,
          price: row.avgPricePerKg!,
          count: row.sampleSize,
        },
      ])).values()];
  if (points.length === 0) return [];
  const lines = points.map((point) =>
    `${point.month} ${point.label} ${point.price.toLocaleString("ko-KR")}원/kg${point.count === null ? "" : `, 표본 ${point.count.toLocaleString("ko-KR")}두`}`,
  );
  const trends = [...Map.groupBy(points, (point) => point.label)]
    .map(([label, values]) => movement(label, values))
    .join("");
  const excerpt = `축산물품질평가원 한우 경락가격 공개 집계입니다. ${lines.join("; ")}.${trends}`;
  const sourceHash = sha256([...new Set(selected.map((row) => row.sourceMeta.sha256))].sort().join(":"));
  const chunkHash = sha256(excerpt);
  return [{
    kind: "price",
    sourceId: `structured-price-cattle-${chunkHash.slice(0, 12)}`,
    title: AUCTION_SOURCE_NAME,
    sourceUrl: CATTLE_SOURCE_URL,
    asOf: latestDate(selected),
    sourceHash,
    chunkHash,
    excerpt,
    rowCount: points.length,
    limitations: [
      "공개 경락가격 집계이며 해당 상품 기초자산의 매각가격이나 수익을 뜻하지 않습니다.",
      "부분 월 표본과 성별·등급별 표본 수 차이를 함께 확인해야 합니다.",
    ],
  }];
};

const pigPriceEvidence = (
  rows: readonly PigAuctionRow[],
  query: Extract<LivestockStructuredQuery, { kind: "price" }>,
): LivestockStructuredEvidence[] => {
  const months = scopedMonths(rows.map((row) => row.month), query);
  const skinType = query.skinType ?? "탕박";
  const sex = query.sex ?? "전체";
  const grade = query.grade ?? "등외제외";
  const region = query.region ?? "전국(제주제외)";
  const selected = rows.filter((row) =>
    months.includes(row.month) && row.skinType === skinType && row.sex === sex &&
    row.grade === grade && row.region.includes(region) && row.priceWonPerKg !== null,
  );
  if (selected.length === 0) return [];
  const points = selected.map((row) => ({ month: row.month, price: row.priceWonPerKg! }));
  const lines = selected.map((row) =>
    `${row.month} ${row.skinType}·${row.sex}·${row.grade} ${row.priceWonPerKg!.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원/kg, 경락두수 ${row.headCount?.toLocaleString("ko-KR") ?? "미확인"}두`,
  );
  const excerpt = `축산물품질평가원 한돈 경락가격 공개 집계(${region})입니다. ${lines.join("; ")}.${movement("선택 조건 가격", points)}`;
  const sourceHash = selected[0]!.sourceMeta.sha256;
  const chunkHash = sha256(excerpt);
  return [{
    kind: "price",
    sourceId: `structured-price-pig-${chunkHash.slice(0, 12)}`,
    title: PIG_AUCTION_SOURCE_NAME,
    sourceUrl: PIG_AUCTION_FILE_ENDPOINT,
    asOf: latestDate(selected),
    sourceHash,
    chunkHash,
    excerpt,
    rowCount: selected.length,
    limitations: [
      "전국(제주제외) 공개 경락가격 집계이며 해당 상품 기초자산의 정산가격이나 수익을 뜻하지 않습니다.",
      "돈피·성별·등급 조건이 다른 집계를 직접 비교하지 않아야 합니다.",
    ],
  }];
};

const diseaseEvidence = (
  categoryId: "cattle" | "pig",
  rows: readonly LivestockDiseaseRow[],
  query: Extract<LivestockStructuredQuery, { kind: "disease" }>,
): LivestockStructuredEvidence[] => {
  const selected = rows.filter((row) =>
    row.species === categoryId &&
    (!query.disease || row.disease === query.disease) &&
    (!query.fromDate || row.occurredOn >= query.fromDate) &&
    (!query.toDate || row.occurredOn <= query.toDate) &&
    (!query.region || row.region.includes(query.region)),
  );
  return [...Map.groupBy(selected, (row) => row.disease)].map(([disease, events]) => {
    const yearly = [...Map.groupBy(events, (event) => event.occurredOn.slice(0, 4))]
      .map(([year, values]) => `${year}년 ${values.length}건`)
      .join(", ");
    const provinces = [...Map.groupBy(events, (event) => event.province)]
      .map(([province, values]) => [province, values.length] as const)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko-KR"))
      .slice(0, 8)
      .map(([province, count]) => `${province} ${count}건`)
      .join(", ");
    const recent = [...events].sort((left, right) => right.occurredOn.localeCompare(left.occurredOn))
      .slice(0, 10)
      .map((event) => `${event.occurredOn} ${event.region}`)
      .join("; ");
    const label = DISEASE_LABEL[disease];
    const excerpt = `농림축산식품부 ${label}(${disease}) 공개 발생 이력은 선택 조건에서 ${events.length}건입니다. 연도별 ${yearly}. 지역별 ${provinces}. 최근 공개 사례: ${recent}.`;
    const sourceHash = sha256([...new Set(events.map((event) => event.sourceMeta.sha256))].sort().join(":"));
    const chunkHash = sha256(excerpt);
    return {
      kind: "disease" as const,
      sourceId: `structured-disease-${categoryId}-${disease.toLocaleLowerCase()}-${chunkHash.slice(0, 12)}`,
      title: `${label}(${disease}) 공개 발생 이력`,
      sourceUrl: events[0]!.sourceMeta.sourceUrl,
      asOf: latestDate(events),
      sourceHash,
      chunkHash,
      excerpt,
      rowCount: events.length,
      limitations: [
        "농림축산식품부가 공개한 시도·시군구 단위 발생 이력이며 농장명·농장주·상세주소는 포함하지 않습니다.",
        "지역 발생 사실은 해당 상품의 개별 가축 감염이나 손익 영향을 뜻하지 않습니다.",
      ],
    };
  });
};

export const buildLivestockStructuredEvidence = (
  categoryId: "cattle" | "pig",
  query: LivestockStructuredQuery,
  data: LivestockStructuredData,
): readonly LivestockStructuredEvidence[] =>
  query.kind === "price"
    ? categoryId === "cattle"
      ? cattlePriceEvidence(data.cattle, query)
      : pigPriceEvidence(data.pig, query)
    : diseaseEvidence(categoryId, data.disease, query);

const fileData = async (query: LivestockStructuredQuery): Promise<LivestockStructuredData> => {
  const index = await loadManifestIndex();
  const [cattle, pig, disease] = await Promise.all([
    query.kind === "price" ? buildCattleAuctionRows("data", index) : [],
    query.kind === "price" ? buildPigAuctionRows("data", index) : [],
    query.kind === "disease" ? buildLivestockDiseaseRows("data", index) : [],
  ]);
  return { cattle, pig, disease };
};

const dbData = async (query: LivestockStructuredQuery): Promise<LivestockStructuredData> => {
  const db = getRuntimeDb();
  const [cattleRows, pigRows, diseaseRows] = await Promise.all([
    query.kind === "price" ? db.select().from(cattleAuctionPrices) : [],
    query.kind === "price" ? db.select().from(pigAuctionPrices) : [],
    query.kind === "disease" ? db.select().from(livestockDiseaseEvents) : [],
  ]);
  return {
    cattle: cattleRows.map((row) => ({
      month: row.month,
      breedCd: row.breedCd,
      sexCd: row.sexCd,
      gradeCd: row.gradeCd,
      pricePerKg: row.pricePerKg === null ? null : Number(row.pricePerKg),
      headCount: row.headCount,
      avgPricePerKg: row.avgPricePerKg === null ? null : Number(row.avgPricePerKg),
      sampleSize: row.sampleSize,
      partial: row.partial,
      sourceMeta: sourceMetaSchema.parse(row.sourceMeta),
    })),
    pig: pigRows.map((row) => ({
      month: row.month,
      skinType: row.skinType,
      sex: row.sex,
      grade: row.grade,
      region: row.region,
      headCount: row.headCount,
      priceWonPerKg: row.priceWonPerKg === null ? null : Number(row.priceWonPerKg),
      amountWon: row.amountWon,
      weightKg: row.weightKg,
      sourceMeta: sourceMetaSchema.parse(row.sourceMeta),
    })),
    disease: diseaseRows.map((row) => ({
      sourceEventId: row.sourceEventId,
      disease: row.disease as LivestockDiseaseRow["disease"],
      species: row.species as LivestockDiseaseRow["species"],
      occurredOn: row.occurredOn,
      province: row.province,
      cityCounty: row.cityCounty,
      region: row.region,
      headCount: row.headCount,
      headCountBasis: row.headCountBasis as LivestockDiseaseRow["headCountBasis"],
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      locationPrecision: row.locationPrecision,
      sourceUrl: row.sourceUrl,
      sourceMeta: sourceMetaSchema.parse(row.sourceMeta),
    })),
  };
};

export const retrieveLivestockStructuredEvidence = async (
  categoryId: string,
  query: LivestockStructuredQuery | null,
): Promise<{ readonly storage: "db" | "file"; readonly evidence: readonly LivestockStructuredEvidence[] }> => {
  const storage = storageMode();
  if ((categoryId !== "cattle" && categoryId !== "pig") || !query) {
    return { storage, evidence: [] };
  }
  const data = storage === "db" ? await dbData(query) : await fileData(query);
  return { storage, evidence: buildLivestockStructuredEvidence(categoryId, query, data) };
};
