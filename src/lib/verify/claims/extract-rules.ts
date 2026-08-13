import type { Claim, ClaimKind, DocumentRef, Verifiability } from "../types";
import {
  flatTables,
  parseDocument,
  type DocumentTable,
} from "../parse/document";
import { columnIndexByAliases, type ParsedTable } from "../parse/tables";
import {
  resolveDocumentProfile,
  type ColumnKey,
  type DocumentProfile,
} from "../parse/profiles";
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

export interface HeadTableSelection {
  readonly profile: DocumentProfile;
  readonly source: DocumentTable;
  readonly columns: Readonly<Record<ColumnKey, number>>;
  readonly allTables: readonly ParsedTable[];
  readonly notes: readonly string[];
}

interface FieldSpec {
  readonly kind: ClaimKind;
  readonly field: string;
  readonly raw: string;
  readonly gated: GateResult<string | number>;
  readonly unit?: string;
}

export const claimId = (kind: ClaimKind, subject: string): string =>
  `${kind}:${subject}`;

const columnMap = (
  table: ParsedTable,
  profile: DocumentProfile,
): Readonly<Record<ColumnKey, number>> => ({
  label: Math.max(columnIndexByAliases(table, profile.columns.label), 0),
  name: columnIndexByAliases(table, profile.columns.name),
  trace: columnIndexByAliases(table, profile.columns.trace),
  date: columnIndexByAliases(table, profile.columns.date),
  price: columnIndexByAliases(table, profile.columns.price),
  custody: columnIndexByAliases(table, profile.columns.custody),
});

const hasSignature = (
  table: ParsedTable,
  signature: readonly string[],
): boolean =>
  signature.every((needle) =>
    table.header.some((cell) => cell.replace(/\s/g, "").includes(needle)),
  );

export const selectHeadTable = (
  xml: string,
  document: DocumentRef,
): HeadTableSelection | undefined => {
  const { profile, matched } = resolveDocumentProfile(document.offerId);
  const parsed = parseDocument(xml);
  const candidates = parsed.tables.filter((entry) =>
    hasSignature(entry.table, profile.headerSignature),
  );

  const source = candidates[0];
  if (!source) return undefined;

  const notes: string[] = [];
  if (!matched) {
    notes.push(
      `공모 ${document.offerId}의 발행사 프로필이 없어 기본 프로필(${profile.id})로 추출했습니다 — 사람 검수가 필요합니다.`,
    );
  }
  if (candidates.length > 1) {
    notes.push(
      `개체 명세표 후보가 ${candidates.length}건이라 첫 번째 표만 사용했습니다.`,
    );
  }

  return {
    profile,
    source,
    columns: columnMap(source.table, profile),
    allTables: flatTables(parsed),
    notes,
  };
};

const buildClaim = (
  spec: FieldSpec,
  subject: string,
  document: DocumentRef,
  selection: HeadTableSelection,
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
    location: {
      section:
        selection.source.section.length > 0
          ? selection.source.section
          : selection.profile.sectionFallback,
      table: selection.profile.tableName,
      row,
      sectionPath: selection.source.sectionPath,
      charOffset: selection.source.charOffset,
    },
    verifiability,
    ...(spec.gated.ok ? {} : { demotionReason: spec.gated.reason }),
  };
};

const rowSpecs = (
  cells: readonly string[],
  columns: Readonly<Record<ColumnKey, number>>,
  sexRaw: string | undefined,
): readonly FieldSpec[] => {
  const at = (key: ColumnKey): string => {
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
  return label.length > 0 && cells.filter((c) => c.length > 0).length >= 3;
};

export interface HeadRow {
  readonly cells: readonly string[];
  readonly row: number;
  readonly subject: string;
  readonly traceNoRaw: string;
}

export const selectHeadRows = (
  selection: HeadTableSelection,
): readonly HeadRow[] =>
  selection.source.table.rows
    .map((cells, offset) => ({ cells, row: offset + 1 }))
    .filter(({ cells }) =>
      isHeadRow((cells[selection.columns.label] ?? "").trim(), cells),
    )
    .map(({ cells, row }) => ({
      cells,
      row,
      subject: (cells[selection.columns.label] ?? "").trim(),
      traceNoRaw: (cells[selection.columns.trace] ?? "").trim(),
    }));

export const headTableMissingNote = (offerId: string): string => {
  const { profile } = resolveDocumentProfile(offerId);
  return `개체 명세표(헤더 ${profile.headerSignature.join("·")})를 원문에서 찾지 못했습니다.`;
};

export const extractClaims = (
  xml: string,
  document: DocumentRef,
): ExtractionResult => {
  const selection = selectHeadTable(xml, document);
  return selection
    ? extractClaimsFrom(selection, document)
    : {
        claims: [],
        demotions: [],
        notes: [headTableMissingNote(document.offerId)],
      };
};

export const extractClaimsFrom = (
  selection: HeadTableSelection,
  document: DocumentRef,
): ExtractionResult => {
  const notes: string[] = [...selection.notes];
  const heads = selectHeadRows(selection);

  const sexTargets: readonly SexIndexTarget[] = heads.map(
    ({ subject, traceNoRaw }) => ({ subject, traceNoRaw }),
  );
  const sexIndex = buildSexIndex(selection.allTables, sexTargets);

  const claims: Claim[] = [];
  const demotions: ClaimDemotion[] = [];

  for (const head of heads) {
    const sexRaw =
      detectSex(head.cells.join(" ")) ?? sexIndex.get(head.subject);

    for (const spec of rowSpecs(head.cells, selection.columns, sexRaw)) {
      const claim = buildClaim(spec, head.subject, document, selection, head.row);
      claims.push(claim);
      if (!spec.gated.ok) {
        demotions.push({ claimId: claim.id, reason: spec.gated.reason });
      }
    }
  }

  const sexMissing = claims.filter(
    (claim) =>
      claim.kind === "livestock_sex" && claim.verifiability === "unparsed",
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
