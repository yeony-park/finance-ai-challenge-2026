import productData from "@/data/products.json";
import artnguideTrackRecordData from "@/data/artnguide_track_records.json";
import tessaSaleRecordData from "@/data/tessa_sale_records.json";
import weshareartResearchData from "@/data/weshareart_research.json";

export type ProductSource = {
  id: string;
  label: string;
  as_of: string | null;
  url: string;
  document_name?: string | null;
  publisher?: string | null;
};

export type CatalogProduct = {
  id: string;
  category: string;
  name: string;
  issuer: string;
  status: string;
  status_detail?: string;
  as_of: string;
  source_state: string;
  asset?: Record<string, unknown>;
  offering?: {
    amount?: number | null;
    units?: number | null;
    unit_price?: number | null;
  };
  art_price?: Record<string, unknown>;
  artist_market?: Record<string, unknown>;
  sources: ProductSource[];
  common_model?: {
    service?: { brand?: string; operator?: string; platform?: string };
    schedule?: { offering_announcement_date?: string | null };
    review_status?: { value?: string; reason?: string };
    review?: { status?: string; status_reason?: string };
    comments?: { card?: { text?: string }; detail?: Array<{ text?: string }> };
  };
};

type ArtnguideTrackRecord = {
  id: number;
  title: string;
  authorName: string;
  yearItem: string;
  status: string;
  startAt: string;
  endAt: string;
  soldTime: string | null;
  gpMoney: number | null;
  soldMoney: number | null;
  soldNote: string | null;
  profit: number | null;
  dateHold: number | null;
  soldPlace: string | null;
  artMaterial: string | null;
  artSize: string | null;
};

type ArtnguideAnnotation = {
  id: number;
  page_api_url: string;
  display?: {
    transaction_type?: string;
    status_label?: string;
  };
};

type WeshareartTrackRecord = {
  source_urls: {
    goods_page?: string;
  };
  list: {
    goodsCoPurchaseId: number | null;
    goodsId: number;
    goodsName: string | null;
    coPurchaseStatusCategory: string | null;
    coPurchaseStatus: string | null;
    investBeginDateTime: string | null;
    investEndDateTime: string | null;
    artistNameForKorean: string | null;
    artistNameForEnglish: string | null;
    titleForKorean: string | null;
    titleForEnglish: string | null;
    pieceAmount: number | null;
  };
  detail: {
    artwork?: {
      title?: string | null;
      artist?: {
        artistName?: string | null;
        artistNameForKorean?: string | null;
        artistNameForEnglish?: string | null;
      };
    };
    type?: string | null;
    pieceAmount?: number | null;
    estimateMinAmount?: number | null;
    estimateMaxAmount?: number | null;
    status?: string | null;
    statusCategoryCode?: string | null;
  };
};

type TessaSaleRecord = {
  record_id: string;
  disclosure_id: string;
  category: string | null;
  registration_timestamp: string | null;
  page_display_date: string | null;
  original_written_date: string | null;
  vote_date: string | null;
  sale_method: string | null;
  disclosure_title: string;
  disclosure_url: string | null;
  asset: { title: string | null; artist: string | null };
  initial_price?: { label?: string | null; amount_krw?: number | null };
  sale_price?: { label?: string | null; amount?: number | null; currency?: string | null };
  settlement?: { label?: string | null; amount_krw?: number | null; payout_date?: string | null };
};

export type PlatformRecordDate = {
  label: string;
  value: string;
};

export type PlatformRecordMoney = {
  label: string;
  amount: number;
  currency: string | null;
};

export type PlatformTrackRecord = {
  id: string;
  sourceKey: "artnguide" | "weshareart" | "tessa";
  platform: string;
  sourceLabel: string;
  title: string;
  artist: string | null;
  status: string | null;
  category: string | null;
  dates: PlatformRecordDate[];
  money: PlatformRecordMoney[];
  locationOrMethod: string | null;
  sourceUrl: string | null;
  searchText: string;
};

export type PlatformRecordSource = {
  key: PlatformTrackRecord["sourceKey"];
  platform: string;
  label: string;
  asOf: string | null;
  count: number;
};

const catalog = productData as unknown as { as_of: string; products: CatalogProduct[] };
const artnguideTrackRecords = artnguideTrackRecordData as unknown as {
  dataset?: { verified_at?: string; as_of?: string };
  records: ArtnguideTrackRecord[];
  record_annotations: ArtnguideAnnotation[];
};
const weshareartTrackRecords = weshareartResearchData as unknown as {
  dataset?: { as_of?: string };
  track_records: { records: WeshareartTrackRecord[] };
};
const tessaSaleRecords = tessaSaleRecordData as unknown as {
  dataset?: { as_of?: string };
  records: TessaSaleRecord[];
};

export const catalogAsOf = catalog.as_of;
export const products = catalog.products;

function textValues(values: Array<string | number | null | undefined>) {
  return values.filter((value): value is string | number => value !== null && value !== undefined && value !== "");
}

function money(label: string | null | undefined, amount: number | null | undefined, currency: string | null = "KRW") {
  return typeof amount === "number" ? [{ label: label ?? "금액", amount, currency }] : [];
}

const artnguideAnnotations = new Map(artnguideTrackRecords.record_annotations.map((annotation) => [annotation.id, annotation]));

const artnguideRecords: PlatformTrackRecord[] = artnguideTrackRecords.records.map((record) => {
  const annotation = artnguideAnnotations.get(record.id);
  const dates = [
    { label: "공동구매 시작일", value: record.startAt },
    { label: "공동구매 종료일", value: record.endAt },
    ...(record.soldTime ? [{ label: "게시된 매각일", value: record.soldTime }] : []),
  ];
  const amounts = [
    ...money("공동구매 금액", record.gpMoney),
    ...(record.soldMoney && record.soldMoney > 0 ? money("게시된 매각금액", record.soldMoney) : []),
  ];
  const searchable = textValues([
    "artnguide",
    "아트앤가이드",
    "아트앤가이드 청약 공동구매 매각현황",
    `artnguide:${record.id}`,
    record.id,
    record.title,
    record.authorName,
    record.status,
    annotation?.display?.status_label,
    annotation?.display?.transaction_type,
    record.startAt,
    record.endAt,
    record.soldTime,
    record.soldPlace,
    record.soldNote,
  ]);
  return {
    id: `artnguide:${record.id}`,
    sourceKey: "artnguide",
    platform: "아트앤가이드",
    sourceLabel: "아트앤가이드 청약·공동구매 매각현황",
    title: record.title,
    artist: record.authorName,
    status: record.status,
    category: annotation?.display?.transaction_type ?? null,
    dates,
    money: amounts,
    locationOrMethod: record.soldPlace,
    sourceUrl: annotation?.page_api_url ?? null,
    searchText: searchable.join(" ").toLocaleLowerCase("ko-KR"),
  };
});

const weshareartRecords: PlatformTrackRecord[] = weshareartTrackRecords.track_records.records.map((record) => {
  const artwork = record.detail.artwork;
  const artist = artwork?.artist?.artistNameForKorean ?? artwork?.artist?.artistName ?? record.list.artistNameForKorean ?? record.list.artistNameForEnglish;
  const title = artwork?.title ?? record.list.titleForKorean ?? record.list.goodsName ?? "작품명 미기재";
  const status = record.detail.status ?? record.list.coPurchaseStatus;
  const category = record.detail.statusCategoryCode ?? record.list.coPurchaseStatusCategory;
  const dates = [
    ...(record.list.investBeginDateTime ? [{ label: "투자 시작일", value: record.list.investBeginDateTime }] : []),
    ...(record.list.investEndDateTime ? [{ label: "투자 종료일", value: record.list.investEndDateTime }] : []),
  ];
  const amounts = [
    ...money("좌당 금액", record.detail.pieceAmount ?? record.list.pieceAmount),
    ...money("추정 최소금액", record.detail.estimateMinAmount),
    ...money("추정 최대금액", record.detail.estimateMaxAmount),
  ];
  const searchable = textValues([
    "weshareart",
    "아트투게더",
    "아트투게더 지난 공동구매",
    `weshareart:goods:${record.list.goodsId}`,
    `goods:${record.list.goodsId}`,
    record.list.goodsCoPurchaseId === null ? null : `co-purchase:${record.list.goodsCoPurchaseId}`,
    record.list.goodsId,
    record.list.goodsCoPurchaseId,
    title,
    record.list.goodsName,
    record.list.titleForKorean,
    record.list.titleForEnglish,
    artist,
    artwork?.artist?.artistNameForEnglish,
    status,
    category,
    record.list.investBeginDateTime,
    record.list.investEndDateTime,
    record.detail.type,
  ]);
  return {
    id: `weshareart:goods:${record.list.goodsId}`,
    sourceKey: "weshareart",
    platform: "아트투게더",
    sourceLabel: "아트투게더 지난 공동구매",
    title,
    artist: artist ?? null,
    status: status ?? null,
    category: category ?? null,
    dates,
    money: amounts,
    locationOrMethod: record.detail.type ?? null,
    sourceUrl: record.source_urls.goods_page ?? null,
    searchText: searchable.join(" ").toLocaleLowerCase("ko-KR"),
  };
});

const tessaRecords: PlatformTrackRecord[] = tessaSaleRecords.records.map((record) => {
  const dates = [
    ...(record.registration_timestamp ? [{ label: "게시 등록시각", value: record.registration_timestamp }] : []),
    ...(record.page_display_date ? [{ label: "게시 표시일", value: record.page_display_date }] : []),
    ...(record.original_written_date ? [{ label: "원작성일", value: record.original_written_date }] : []),
    ...(record.vote_date ? [{ label: "매각 투표일", value: record.vote_date }] : []),
    ...(record.settlement?.payout_date ? [{ label: "지급일", value: record.settlement.payout_date }] : []),
  ];
  const amounts = [
    ...money(record.initial_price?.label, record.initial_price?.amount_krw),
    ...money(record.sale_price?.label, record.sale_price?.amount, record.sale_price?.currency ?? null),
    ...money(record.settlement?.label, record.settlement?.amount_krw),
  ];
  const searchable = textValues([
    "tessa",
    "TESSA",
    "TESSA 매각대금 정산 공시",
    record.record_id,
    record.disclosure_id,
    record.disclosure_title,
    record.asset.title,
    record.asset.artist,
    record.category,
    record.registration_timestamp,
    record.page_display_date,
    record.original_written_date,
    record.vote_date,
    record.settlement?.payout_date,
    record.sale_method,
  ]);
  return {
    id: record.record_id,
    sourceKey: "tessa",
    platform: "TESSA",
    sourceLabel: "TESSA 매각대금 정산 공시",
    title: record.asset.title ?? record.disclosure_title,
    artist: record.asset.artist,
    status: null,
    category: record.category,
    dates,
    money: amounts,
    locationOrMethod: record.sale_method,
    sourceUrl: record.disclosure_url,
    searchText: searchable.join(" ").toLocaleLowerCase("ko-KR"),
  };
});

export const platformRecords = [...artnguideRecords, ...weshareartRecords, ...tessaRecords];

const sourceMetadata = [
  { key: "artnguide", platform: "아트앤가이드", label: "아트앤가이드 청약·공동구매 매각현황", asOf: artnguideTrackRecords.dataset?.verified_at ?? artnguideTrackRecords.dataset?.as_of ?? null },
  { key: "weshareart", platform: "아트투게더", label: "아트투게더 지난 공동구매", asOf: weshareartTrackRecords.dataset?.as_of ?? null },
  { key: "tessa", platform: "TESSA", label: "TESSA 매각대금 정산 공시", asOf: tessaSaleRecords.dataset?.as_of ?? null },
] as const;

export const platformRecordSources: PlatformRecordSource[] = sourceMetadata.map((source) => ({
  ...source,
  count: platformRecords.filter((record) => record.sourceKey === source.key).length,
}));

export const trackRecordsAsOf = platformRecordSources.reduce<string>((latest, source) => {
  if (!source.asOf) return latest;
  return !latest || source.asOf > latest ? source.asOf : latest;
}, "") || "확인 불가";

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

export function searchProducts(query: string) {
  const keywords = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!keywords.length) return [];

  return products.filter((product) => {
    const searchable = [
      product.id,
      product.category,
      product.name,
      product.issuer,
      product.status,
      product.source_state,
      product.common_model?.service?.brand,
      product.common_model?.service?.operator,
      String(product.asset?.artist ?? ""),
      String(product.asset?.artist_name ?? ""),
      String(product.asset?.title ?? ""),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return keywords.every((keyword) => searchable.includes(keyword));
  });
}

export function searchTrackRecords(query: string) {
  const keywords = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!keywords.length) return [];

  return platformRecords.filter((record) => keywords.every((keyword) => record.searchText.includes(keyword)));
}

export function formatKrw(value: number | null | undefined) {
  return typeof value === "number" ? `${new Intl.NumberFormat("ko-KR").format(value)}원` : "확인 불가";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "확인 불가";
  return value.slice(0, 10);
}

export function productReviewReason(product: CatalogProduct) {
  return product.common_model?.review_status?.reason ?? product.common_model?.review?.status_reason ?? "검토 기준이 확인되지 않았습니다.";
}
