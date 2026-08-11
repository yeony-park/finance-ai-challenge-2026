/**
 * 규칙 기반 claim 추출 (LLM 없음 — S0 범위).
 * 신고서의 정형 TABLE에서 개체별 이력번호·고유명칭·취득시기·취득원가·보관장소를 뽑고,
 * zod 게이트를 통과하지 못한 필드는 파이프라인을 멈추는 대신 "확인 불가"로 강등한다.
 */
import type { Claim, ClaimKind, DocumentRef, Verifiability } from "../types";
import {
  columnIndex,
  findTablesByHeader,
  readTables,
  type ParsedTable,
} from "../parse/tables";
import {
  acquisitionDateSchema,
  acquisitionPriceSchema,
  breedSchema,
  custodyLocationSchema,
  gate,
  sexSchema,
  traceNo9Schema,
  type GateResult,
} from "./schema";
import { buildSexIndex, detectSex, type SexIndexTarget } from "./sex-index";

/**
 * 개체 명세표를 식별하는 헤더 시그니처.
 * 신고서에는 이력번호를 쓰는 표가 10여 개 있으므로(사료비·경매가·등급 등)
 * "고유명칭 + 취득시기 + 보관장소"까지 요구해 취득 명세표만 특정한다.
 */
const HEAD_TABLE_SIGNATURE = [
  "고유명칭",
  "이력번호",
  "취득시기",
  "보관장소",
] as const;
const SECTION = "8. 기초자산 취득에 관한 사항";
const TABLE_NAME = "기초자산 개체 명세표";

/** 개체 행에서 성별을 읽지 못했을 때 남기는 강등 사유 */
const SEX_NOT_FOUND =
  "개체 행에서 성별 서술을 찾지 못했습니다 (문서 전체 서술은 개체에 전파하지 않습니다)";

export interface ClaimDemotion {
  readonly claimId: string;
  readonly reason: string;
}

export interface ExtractionResult {
  readonly claims: readonly Claim[];
  readonly demotions: readonly ClaimDemotion[];
  readonly notes: readonly string[];
}

interface FieldSpec {
  readonly kind: ClaimKind;
  readonly field: string;
  readonly raw: string;
  readonly gated: GateResult<string | number>;
  readonly unit?: string;
}

const claimId = (kind: ClaimKind, subject: string): string =>
  `${kind}:${subject}`;

const buildClaim = (
  spec: FieldSpec,
  subject: string,
  document: DocumentRef,
  row: number,
): Claim => {
  const verifiability: Verifiability = spec.gated.ok
    ? "verifiable"
    : "unparsed";
  const value = spec.gated.ok ? String(spec.gated.value) : spec.raw;
  const numericValue =
    spec.gated.ok && typeof spec.gated.value === "number"
      ? spec.gated.value
      : undefined;

  return {
    id: claimId(spec.kind, subject),
    kind: spec.kind,
    subject,
    field: spec.field,
    value,
    ...(numericValue === undefined ? {} : { numericValue }),
    ...(spec.unit === undefined ? {} : { unit: spec.unit }),
    document,
    location: { section: SECTION, table: TABLE_NAME, row },
    verifiability,
    ...(spec.gated.ok ? {} : { demotionReason: spec.gated.reason }),
  };
};

const rowSpecs = (
  cells: readonly string[],
  columns: Readonly<Record<string, number>>,
  sexRaw: string | undefined,
): readonly FieldSpec[] => {
  const at = (key: string): string => {
    const index = columns[key];
    return index >= 0 ? (cells[index] ?? "") : "";
  };

  const specs: FieldSpec[] = [
    {
      kind: "livestock_trace_no",
      field: "이력번호",
      raw: at("trace"),
      gated: gate(traceNo9Schema, at("trace")),
    },
    {
      kind: "livestock_breed",
      field: "품종",
      raw: at("name"),
      gated: gate(breedSchema, at("name")),
    },
    {
      kind: "acquisition_date",
      field: "취득시기",
      raw: at("date"),
      gated: gate(acquisitionDateSchema, at("date")),
    },
    {
      kind: "acquisition_price",
      field: "취득원가",
      raw: at("price"),
      gated: gate(acquisitionPriceSchema, at("price")),
      unit: "원",
    },
    {
      kind: "custody_location",
      field: "보관장소",
      raw: at("custody"),
      gated: gate(custodyLocationSchema, at("custody")),
    },
  ];

  // 성별은 개체마다 붙이되, 그 행에서 읽지 못했으면 그 행만 확인 불가로 강등한다
  specs.splice(2, 0, {
    kind: "livestock_sex",
    field: "성별",
    raw: sexRaw ?? "",
    gated:
      sexRaw === undefined
        ? { ok: false, reason: SEX_NOT_FOUND }
        : gate(sexSchema, sexRaw),
  });
  return specs;
};

const isHeadRow = (label: string, cells: readonly string[]): boolean => {
  if (/^(합계|소계|계)$/.test(label.replace(/\s/g, ""))) return false;
  // 이력번호 열이나 고유명칭 열 중 하나라도 내용이 있어야 개체 행으로 본다
  return label.length > 0 && cells.filter((c) => c.length > 0).length >= 3;
};

const columnMap = (table: ParsedTable): Readonly<Record<string, number>> => ({
  label: Math.max(columnIndex(table, "구분"), 0),
  name: columnIndex(table, "고유명칭"),
  trace: columnIndex(table, "이력번호"),
  date: columnIndex(table, "취득시기"),
  price: columnIndex(table, "취득원가"),
  custody: columnIndex(table, "보관장소"),
});

/** 원문 XML → 개체별 claim 목록. 실패 필드는 확인 불가로 강등하고 사유를 남긴다. */
export const extractClaims = (
  xml: string,
  document: DocumentRef,
): ExtractionResult => {
  const tables = readTables(xml);
  const candidates = findTablesByHeader(tables, HEAD_TABLE_SIGNATURE);

  if (candidates.length === 0) {
    return {
      claims: [],
      demotions: [],
      notes: [
        `개체 명세표(헤더 ${HEAD_TABLE_SIGNATURE.join("·")})를 원문에서 찾지 못했습니다.`,
      ],
    };
  }

  const notes: string[] =
    candidates.length > 1
      ? [
          `개체 명세표 후보가 ${candidates.length}건이라 첫 번째 표만 사용했습니다.`,
        ]
      : [];

  const table = candidates[0];
  const columns = columnMap(table);

  // 개체 행 목록을 먼저 확정한 뒤, 성별을 개체 행 단위로 찾는다
  const heads = table.rows
    .map((cells, offset) => ({ cells, row: offset + 1 }))
    .filter(({ cells }) => isHeadRow((cells[columns.label] ?? "").trim(), cells))
    .map(({ cells, row }) => ({
      cells,
      row,
      subject: (cells[columns.label] ?? "").trim(),
      traceNoRaw: (cells[columns.trace] ?? "").trim(),
    }));

  const sexTargets: readonly SexIndexTarget[] = heads.map(
    ({ subject, traceNoRaw }) => ({ subject, traceNoRaw }),
  );
  const sexIndex = buildSexIndex(tables, sexTargets);

  const claims: Claim[] = [];
  const demotions: ClaimDemotion[] = [];

  for (const head of heads) {
    // 행 안에 성별 서술이 있으면 그것이 우선, 없으면 다른 표에서 같은 개체를 가리킨 행에서 읽는다
    const sexRaw =
      detectSex(head.cells.join(" ")) ?? sexIndex.get(head.subject);

    for (const spec of rowSpecs(head.cells, columns, sexRaw)) {
      const claim = buildClaim(spec, head.subject, document, head.row);
      claims.push(claim);
      if (!spec.gated.ok) {
        demotions.push({ claimId: claim.id, reason: spec.gated.reason });
      }
    }
  }

  const sexMissing = claims.filter(
    (claim) => claim.kind === "livestock_sex" && claim.verifiability === "unparsed",
  ).length;
  if (sexMissing > 0) {
    notes.push(
      `개체 행에서 성별 서술을 찾지 못한 ${sexMissing}건은 확인 불가로 강등했습니다 (문서 전체 서술은 개체에 전파하지 않습니다).`,
    );
  }

  if (claims.length === 0) {
    notes.push("개체 명세표에서 유효한 개체 행을 찾지 못했습니다.");
  }

  return { claims, demotions, notes };
};
