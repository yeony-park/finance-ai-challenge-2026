const ARTNGUIDE_STATUS = {
  TRANSFER: "매각완료",
  RETURNED_PRODUCT: "매각완료 (원코드 RETURNED_PRODUCT)",
  EXPECTED_TRANSFER: "매각예정",
};

const WESHAREART_STATUS = {
  RECRUITED: "모집종료",
  DISTRIBUTED: "매각완료",
};

const TESSA_STATUS = {
  SETTLED: "TESSA 공시상 매각·정산",
};

const text = (value) => (value == null ? "" : String(value).trim());
const includes = (value, query) => text(value).toLocaleLowerCase("ko-KR").includes(query);

function sourceLinks(source, record) {
  if (source === "artnguide") {
    const page = record.page || 1;
    return [
      {
        label: "매각현황 화면",
        url: "https://artnguide.co.kr/purchase-summary",
      },
      {
        label: `${page}페이지 API`,
        url: `https://api.artnguide.co.kr/api/v1/gp/use-gp-plan?page=${page}&size=10&listStatus=ALL`,
      },
    ];
  }
  if (source === "tessa") {
    return [
      { label: "공시 원문", url: record.disclosureUrl },
      ...(record.attachments || []).map((attachment) => ({
        label: attachment.label || "첨부 PDF",
        url: attachment.url,
      })),
    ];
  }
  const goodsId = record.id;
  const page = record.page || 1;
  return [
    {
      label: "지난 공동구매 화면",
      url: `https://weshareart.com/goods?type=ALL&page=${page}`,
    },
    {
      label: `${page}페이지 API`,
      url: `https://weshareart.com/api/public/goods/co-purchase/page?page=${page}&size=10&coPurchaseStatusCategory=ALL`,
    },
    {
      label: "공개 상세 API",
      url: `https://weshareart.com/api/public/goods?id=${goodsId}`,
    },
  ];
}

function normalizeTessa(payload) {
  if (!payload?.dataset || !Array.isArray(payload.records)) return [];
  return payload.records.map((raw, index) => {
    const asset = raw.asset || {};
    const record = {
      key: `tessa:forum:${raw.disclosure_id}`,
      source: "tessa",
      sourceLabel: "TESSA",
      sequence: raw.sequence || index + 1,
      id: raw.disclosure_id,
      author: text(asset.artist) || "작가 확인 불가",
      title: text(asset.title) || "작품명 확인 불가",
      artworkCode: text(asset.product_code),
      editionIndex: asset.edition_index,
      statusCode: "SETTLED",
      statusLabel: TESSA_STATUS.SETTLED,
      registrationTimestamp: raw.registration_timestamp,
      registrationTimestampTimezone: raw.registration_timestamp_timezone,
      originalWrittenDate: raw.original_written_date,
      corrected: raw.corrected === true,
      corrections: raw.corrections || [],
      holdingDays: raw.holding_period_days,
      voteDate: raw.vote_date,
      saleMethod: raw.sale_method,
      initialPrice: raw.initial_price || {},
      salePrice: raw.sale_price || {},
      expenses: raw.expenses || [],
      saleProfit: raw.sale_profit || {},
      saleFee: raw.sale_fee || {},
      settlement: raw.settlement || {},
      sourceReportedReturnPct: raw.source_reported_return_pct,
      sourceReportedReturnBasis: raw.source_reported_return_basis,
      sourceReportedReturnRecalculation: raw.source_reported_return_recalculation || null,
      calculatedSettlementReturnPct: raw.calculated_settlement_return_pct,
      calculatedSettlementReturnDisplay: raw.calculated_settlement_return_display,
      taxNote: raw.tax_note,
      disclosureUrl: raw.disclosure_url,
      attachments: raw.attachments || [],
      raw,
      dataset: payload.dataset,
    };
    record.links = sourceLinks("tessa", record);
    return record;
  });
}

function normalizeArtNGuide(payload) {
  if (!payload?.dataset || !Array.isArray(payload.records)) return [];
  const annotations = new Map(
    (payload.record_annotations || []).map((annotation) => [annotation.id, annotation]),
  );
  return payload.records.map((raw, index) => {
    const annotation = annotations.get(raw.id) || {};
    const record = {
      key: `artnguide-${raw.id}`,
      source: "artnguide",
      sourceLabel: "아트앤가이드",
      sequence: annotation.sequence || index + 1,
      page: annotation.page || Math.floor(index / 10) + 1,
      id: raw.id,
      author: text(raw.authorName) || "작가 확인 불가",
      title: text(raw.title) || "작품명 확인 불가",
      year: text(raw.yearItem),
      material: text(raw.artMaterial),
      size: text(raw.artSize),
      statusCode: raw.status,
      statusLabel: annotation.display?.status_label || ARTNGUIDE_STATUS[raw.status] || raw.status,
      startAt: raw.startAt,
      endAt: raw.endAt,
      soldAt: raw.soldTime,
      startDisplay: annotation.display?.start_date_kst || null,
      soldDisplay: annotation.display?.sold_date_kst || null,
      purchaseAmount: raw.gpMoney,
      soldAmount: raw.soldMoney,
      soldPlace: raw.soldPlace,
      profit: raw.profit,
      yearProfit: raw.yearProfit,
      holdingDays: raw.dateHold,
      raw,
      annotation,
      dataset: payload.dataset,
    };
    record.links = sourceLinks("artnguide", record);
    return record;
  });
}

function normalizeWeshareArt(payload) {
  const rows = payload?.track_records?.records;
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => {
    const raw = row.list || {};
    const detail = row.detail || {};
    const artwork = detail.artwork || {};
    const author =
      text(raw.artistNameForKorean) ||
      text(raw.artistNameForEnglish) ||
      text(artwork.artist?.artistName) ||
      "작가 확인 불가";
    const title =
      text(raw.titleForKorean) ||
      text(raw.titleForEnglish) ||
      text(raw.goodsName) ||
      text(artwork.title) ||
      "작품명 확인 불가";
    const record = {
      key: `weshareart-${raw.goodsId}`,
      source: "weshareart",
      sourceLabel: "아트투게더",
      sequence: row.sequence || index + 1,
      page: row.page || Math.floor(index / 10) + 1,
      id: raw.goodsId,
      goodsCoPurchaseId: raw.goodsCoPurchaseId,
      author,
      title,
      year: text(artwork.productionYear),
      material: text(artwork.material),
      size: [artwork.size1, artwork.size2, artwork.size3]
        .filter((value) => value != null)
        .join(" × "),
      statusCode: raw.coPurchaseStatusCategory,
      statusLabel:
        WESHAREART_STATUS[raw.coPurchaseStatusCategory] || raw.coPurchaseStatusCategory,
      startAt: raw.investBeginDateTime,
      endAt: raw.investEndDateTime,
      saleYieldPercent: raw.saleYieldPercent,
      quantity: detail.quantity,
      pieceAmount: detail.pieceAmount,
      estimateMinAmount: detail.estimateMinAmount,
      estimateMaxAmount: detail.estimateMaxAmount,
      provenance: artwork.provenance,
      raw,
      detail,
      dataset: payload.dataset,
    };
    record.links = sourceLinks("weshareart", record);
    return record;
  });
}

export function normalizeTrackDatasets(artnguide, weshareart, tessa) {
  return {
    artnguide: normalizeArtNGuide(artnguide),
    weshareart: normalizeWeshareArt(weshareart),
    tessa: normalizeTessa(tessa),
  };
}

export function filterTrackRecords(records, query = "", status = "ALL") {
  const needle = text(query).toLocaleLowerCase("ko-KR");
  return records.filter((record) => {
    if (status !== "ALL" && record.statusCode !== status) return false;
    if (!needle) return true;
    return [
      record.id,
      record.goodsCoPurchaseId,
      record.artworkCode,
      record.author,
      record.title,
      record.year,
      record.material,
      record.size,
      record.statusCode,
      record.statusLabel,
      record.soldPlace,
      record.provenance,
      record.saleMethod,
    ].some((value) => includes(value, needle));
  });
}

export function statusOptions(records) {
  const counts = new Map();
  for (const record of records) {
    counts.set(record.statusCode, (counts.get(record.statusCode) || 0) + 1);
  }
  const labels = records[0]?.source === "artnguide"
    ? ARTNGUIDE_STATUS
    : records[0]?.source === "tessa"
      ? TESSA_STATUS
      : WESHAREART_STATUS;
  return [
    { value: "ALL", label: "전체", count: records.length },
    ...[...counts.entries()].map(([value, count]) => ({
      value,
      label: labels[value] || value,
      count,
    })),
  ];
}

export function paginateTrackRecords(records, page = 1, pageSize = 12) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    records: records.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalRecords: records.length,
  };
}

export function clientAnswerSequence(weshareart) {
  const questions = weshareart?.suitability_test?.questions || [];
  return questions.map((question) => question.correct_option);
}
