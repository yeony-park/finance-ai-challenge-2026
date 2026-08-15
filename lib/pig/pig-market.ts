import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type PigMarketPoint = {
  month: string;
  headCount: number;
  priceWonPerKg: number;
  amountWon: number;
  weightKg: number;
};

export type PigMarketSnapshot = {
  method: "official_download";
  points: PigMarketPoint[];
  filters: {
    skinType: string;
    sex: string;
    grade: string;
    region: string;
  };
  sourceFile: string;
  sourceUrl: string;
  retrievedAt: string;
  asOf: string;
  sha256: string;
  status: "market_context";
  limitation: string;
  api: {
    keyConfigured: boolean;
    insecureHttpEnabled: boolean;
    status: "not_configured" | "transport_pending" | "connected" | "failed";
    detail: string;
    latestRepresentative?: {
      date: string;
      priceWonPerKg: number;
    };
  };
};

const SOURCE_FILE = "pig_price_20260815021618.csv";
const SOURCE_URL = "https://www.data.go.kr/data/15148902/fileData.do";
const FILTERS = {
  skinType: "탕박",
  sex: "전체",
  grade: "등외제외",
  region: "전국(제주제외)",
} as const;

let snapshotPromise: Promise<PigMarketSnapshot> | undefined;

function formatYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replaceAll("-", "");
}

function readXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1];
}

async function getKapeApiStatus(): Promise<PigMarketSnapshot["api"]> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const insecureHttpEnabled = process.env.KAPE_ALLOW_INSECURE_HTTP === "true";

  if (!serviceKey) {
    return {
      keyConfigured: false,
      insecureHttpEnabled,
      status: "not_configured",
      detail: "공공데이터포털 서비스키가 설정되지 않았습니다.",
    };
  }

  if (!insecureHttpEnabled) {
    return {
      keyConfigured: true,
      insecureHttpEnabled: false,
      status: "transport_pending",
      detail: "공식 API가 HTTP 주소만 제공해 서버 호출을 보류하고 CSV 저장본을 사용합니다.",
    };
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 13);
  let decodedKey = serviceKey;

  try {
    decodedKey = decodeURIComponent(serviceKey);
  } catch {
    // 이미 평문인 키는 그대로 한 번만 URL 인코딩합니다.
  }

  const params = new URLSearchParams({
    serviceKey: decodedKey,
    pageNo: "1",
    numOfRows: "100",
    startYmd: formatYmd(startDate),
    endYmd: formatYmd(endDate),
  });

  try {
    const response = await fetch(
      `http://data.ekape.or.kr/openapi-data/service/user/grade/auct/pigRepresentativePrice?${params}`,
      { cache: "no-store", signal: AbortSignal.timeout(4500) },
    );
    const xml = await response.text();

    if (!response.ok || readXmlTag(xml, "resultCode") !== "00") {
      return {
        keyConfigured: true,
        insecureHttpEnabled: true,
        status: "failed",
        detail: "축산물품질평가원 API 응답을 확인하지 못해 CSV 저장본을 사용합니다.",
      };
    }

    const representativeItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map((match) => match[1])
      .filter((item) => readXmlTag(item, "sableGubn") === "대표가격")
      .map((item) => ({
        date: readXmlTag(item, "sumYmd") ?? "",
        priceWonPerKg: Number(readXmlTag(item, "costAmt")),
      }))
      .filter((item) => item.date && Number.isFinite(item.priceWonPerKg))
      .sort((left, right) => right.date.localeCompare(left.date));

    return {
      keyConfigured: true,
      insecureHttpEnabled: true,
      status: "connected",
      detail: "서버에서 일별 대표가격 API 응답을 확인했습니다. 월별 CSV와 같은 정의로 간주하지 않습니다.",
      latestRepresentative: representativeItems[0],
    };
  } catch {
    return {
      keyConfigured: true,
      insecureHttpEnabled: true,
      status: "failed",
      detail: "축산물품질평가원 API 연결이 지연되어 CSV 저장본을 사용합니다.",
    };
  }
}

function parseCsvRow(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  cells.push(value);
  return cells;
}

function parseRequiredNumber(value: string, field: string) {
  if (value === "-") {
    throw new Error(`${field} 값이 비어 있습니다.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} 값을 숫자로 읽을 수 없습니다.`);
  }

  return parsed;
}

function normalizeMonth(value: string) {
  const match = value.match(/^(\d{4})\.\s*(\d{2})$/);
  if (!match) {
    throw new Error(`기준월 형식을 읽을 수 없습니다: ${value}`);
  }

  return `${match[1]}-${match[2]}`;
}

async function loadPigMarketSnapshot(): Promise<PigMarketSnapshot> {
  const filePath = path.join(process.cwd(), "data", "raw", SOURCE_FILE);
  const buffer = await readFile(filePath);
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvRow);

  if (rows.length !== 63 || rows.some((row) => row.length !== 87)) {
    throw new Error("돼지 경락가격 CSV 구조가 예상한 3개 헤더·60개 데이터행과 다릅니다.");
  }

  const [monthHeader, regionHeader, metricHeader] = rows;
  const selectedRow = rows.slice(3).find(
    (row) => row[0] === FILTERS.skinType && row[1] === FILTERS.sex && row[2] === FILTERS.grade,
  );

  if (!selectedRow) {
    throw new Error("돼지 경락가격 CSV에서 지정한 비교 조건을 찾지 못했습니다.");
  }

  const points: PigMarketPoint[] = [];
  for (let index = 3; index < monthHeader.length; index += 4) {
    const metrics = metricHeader.slice(index, index + 4);
    const expectedMetrics = ["경락두수 (두)", "경락가격 (원/㎏)", "거래대금 (원)", "거래중량 (㎏)"];

    if (metrics.some((metric, metricIndex) => metric !== expectedMetrics[metricIndex])) {
      throw new Error("돼지 경락가격 CSV의 측정값 순서가 예상과 다릅니다.");
    }

    if (regionHeader[index] !== FILTERS.region) {
      continue;
    }

    points.push({
      month: normalizeMonth(monthHeader[index]),
      headCount: parseRequiredNumber(selectedRow[index], "경락두수"),
      priceWonPerKg: parseRequiredNumber(selectedRow[index + 1], "경락가격"),
      amountWon: parseRequiredNumber(selectedRow[index + 2], "거래대금"),
      weightKg: parseRequiredNumber(selectedRow[index + 3], "거래중량"),
    });
  }

  if (points.length !== 3) {
    throw new Error("돼지 경락가격 CSV에서 2026년 5~7월 자료를 모두 찾지 못했습니다.");
  }

  const api = await getKapeApiStatus();

  return {
    method: "official_download",
    points,
    filters: FILTERS,
    sourceFile: SOURCE_FILE,
    sourceUrl: SOURCE_URL,
    retrievedAt: "2026-08-15 02:16:18 KST",
    asOf: points.at(-1)?.month ?? "미확인",
    sha256: createHash("sha256").update(buffer).digest("hex"),
    status: "market_context",
    limitation: "월별 시장 집계로 개별 상품의 돼지·출하 로트·실제 정산가격을 확인할 수 없습니다.",
    api,
  };
}

export function getPigMarketSnapshot() {
  snapshotPromise ??= loadPigMarketSnapshot();
  return snapshotPromise;
}
