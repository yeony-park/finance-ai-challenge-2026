import Image from "next/image";
import Link from "next/link";

import {
  listSyntheticArtCurrentProducts,
  listSyntheticArtHistoricalProducts,
  SYNTHETIC_ART_LIMITATION,
  type SyntheticArtCatalogItem,
  type SyntheticArtCurrentProduct,
} from "@/lib/art/synthetic-catalog";

import styles from "./SyntheticArtCatalog.module.css";

export interface ArtCatalogSearchParams {
  readonly q?: string | string[];
  readonly scope?: string | string[];
  readonly status?: string | string[];
  readonly platform?: string | string[];
  readonly page?: string | string[];
  readonly product?: string | string[];
}

interface SyntheticArtCatalogProps {
  readonly searchParams: ArtCatalogSearchParams;
}

const PAGE_SIZE = 24;

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

const normalized = (value: string): string =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

const won = (value: number | null): string =>
  value === null ? "미확인" : `${value.toLocaleString("ko-KR")}원`;

const percent = (value: number | null): string =>
  value === null ? "미확인" : `${value.toFixed(2)}%`;

const CURRENT_STATUS: Readonly<Record<string, string>> = {
  upcoming: "청약 예정",
  open: "청약 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  liquidated: "청산 완료",
  unverified: "상태 미확인",
};

const HISTORY_STATUS: Readonly<Record<string, string>> = {
  offering: "공모",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  returned: "반환",
  liquidated: "청산 완료",
  delayed: "지연",
  unsold: "유찰",
  loss_confirmed: "손실 확정",
  unknown: "상태 미확인",
};

const itemText = (item: SyntheticArtCatalogItem): string => item.kind === "current"
  ? normalized([
      item.offering.id,
      item.offering.title,
      item.artwork.title,
      item.artwork.medium ?? "",
      item.artwork.productionYear?.toString() ?? "",
      item.artist.nameKo,
      item.artist.nameEn ?? "",
      item.platform.name,
      CURRENT_STATUS[item.offering.status] ?? item.offering.status,
    ].join(" "))
  : normalized([
      item.record.id,
      item.record.productName,
      item.record.artworkTitle,
      item.record.artistName,
      item.record.artistNameEn ?? "",
      item.record.artworkMedium ?? "",
      item.record.artworkProductionYear?.toString() ?? "",
      item.record.soldPlace ?? "",
      item.platform.name,
      HISTORY_STATUS[item.record.status] ?? item.record.status,
    ].join(" "));

const itemStatus = (item: SyntheticArtCatalogItem): string =>
  item.kind === "current" ? item.offering.status : item.record.status;

const itemPlatform = (item: SyntheticArtCatalogItem): string => item.platform.id;

const href = (values: Readonly<Record<string, string | undefined>>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `/art?${query}` : "/art";
};

function CurrentCard({ product, query }: { readonly product: SyntheticArtCurrentProduct; readonly query: string }) {
  const { offering, artwork, artist, platform, analysis } = product;
  return (
    <article className={styles.card}>
      <Link
        href={href({ scope: "current", q: query || undefined, product: offering.id })}
        className={styles.imageLink}
        aria-label={`${offering.title} 상세 보기`}
      >
        {artwork.imageUrl ? (
          <Image src={artwork.imageUrl} alt={`${artwork.title} 합성 이미지`} fill sizes="(max-width: 720px) 100vw, 33vw" />
        ) : <span className={styles.imageFallback}>합성 이미지 없음</span>}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.badgeRow}>
          <span className={styles.syntheticBadge}>합성 상품</span>
          <span>{CURRENT_STATUS[offering.status] ?? offering.status}</span>
        </div>
        <h2><Link href={href({ scope: "current", q: query || undefined, product: offering.id })}>{artwork.title}</Link></h2>
        <p className={styles.artist}>{artist.nameKo} · {platform.name}</p>
        <dl className={styles.metrics}>
          <div><dt>최소투자금</dt><dd>{won(offering.minimumInvestment)}</dd></div>
          <div><dt>공모총액</dt><dd>{won(offering.totalOfferingAmount)}</dd></div>
          <div><dt>모집 종료</dt><dd>{offering.subscriptionEnd ?? "미확인"}</dd></div>
        </dl>
        <p className={styles.summary}>{analysis.summary}</p>
      </div>
    </article>
  );
}

function HistoricalCard({ item }: { readonly item: Extract<SyntheticArtCatalogItem, { readonly kind: "historical" }> }) {
  const { record, platform } = item;
  return (
    <article className={styles.card}>
      <div className={styles.imageLink}>
        {record.artworkImageUrl ? (
          <Image src={record.artworkImageUrl} alt={`${record.artworkTitle} 합성 이력 이미지`} fill sizes="(max-width: 720px) 100vw, 33vw" />
        ) : <span className={styles.imageFallback}>합성 이미지 없음</span>}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.badgeRow}>
          <span className={styles.historyBadge}>합성 과거 이력</span>
          <span>{HISTORY_STATUS[record.status] ?? record.status}</span>
        </div>
        <h2>{record.artworkTitle}</h2>
        <p className={styles.artist}>{record.artistName} · {platform.name}</p>
        <dl className={styles.metrics}>
          <div><dt>공모금액</dt><dd>{won(record.offeringAmount)}</dd></div>
          <div><dt>정산 수익률</dt><dd>{percent(record.finalReturn)}</dd></div>
          <div><dt>실제 보유</dt><dd>{record.actualHoldingMonths === null ? "미확인" : `${record.actualHoldingMonths}개월`}</dd></div>
        </dl>
        <p className={styles.summary}>{record.evidenceNote ?? SYNTHETIC_ART_LIMITATION}</p>
      </div>
    </article>
  );
}

function CurrentProductDetail({ product }: { readonly product: SyntheticArtCurrentProduct }) {
  const { offering, artwork, artist, platform, analysis, evidence } = product;
  return (
    <section id="selected-art-product" className={styles.detail} aria-labelledby="selected-art-title">
      <div className={styles.detailImage}>
        {artwork.imageUrl ? <Image src={artwork.imageUrl} alt={`${artwork.title} 합성 이미지`} fill sizes="(max-width: 720px) 100vw, 38vw" priority /> : null}
      </div>
      <div className={styles.detailBody}>
        <div className={styles.badgeRow}><span className={styles.syntheticBadge}>합성 상품 상세</span><span>{offering.asOfDate} 기준</span></div>
        <h2 id="selected-art-title">{artwork.title}</h2>
        <p className={styles.detailLead}>{artist.nameKo} · {artwork.productionYear ?? "연도 미확인"} · {artwork.medium ?? "재료 미확인"}</p>
        <p>{analysis.summary}</p>
        <dl className={styles.detailFacts}>
          <div><dt>가상 플랫폼</dt><dd>{platform.name}</dd></div>
          <div><dt>공모총액</dt><dd>{won(offering.totalOfferingAmount)}</dd></div>
          <div><dt>단가 × 수량</dt><dd>{won(offering.unitPrice)} × {offering.numberOfUnits?.toLocaleString("ko-KR") ?? "미확인"}개</dd></div>
          <div><dt>최소투자금</dt><dd>{won(offering.minimumInvestment)}</dd></div>
          <div><dt>모집 일정</dt><dd>{offering.subscriptionStart ?? "미확인"} ~ {offering.subscriptionEnd ?? "미확인"}</dd></div>
          <div><dt>회수 방식</dt><dd>{offering.exitMethod ?? "미확인"}</dd></div>
        </dl>
        <div className={styles.reasonGrid}>
          {analysis.keyReasons.map((reason) => (
            <article key={reason.title}><h3>{reason.title}</h3><p>{reason.finding}</p><small>{reason.implication}</small></article>
          ))}
        </div>
        <p className={styles.sourceNote}>합성 원천 근거 {evidence.length}건 · 외부 실재 출처 없음</p>
        <p className={styles.limitation}>{SYNTHETIC_ART_LIMITATION}</p>
        <Link href="/art?scope=current" className={styles.closeLink}>상세 닫기</Link>
      </div>
    </section>
  );
}

export async function SyntheticArtCatalog({ searchParams }: SyntheticArtCatalogProps) {
  const [current, historical] = await Promise.all([
    listSyntheticArtCurrentProducts(),
    listSyntheticArtHistoricalProducts(),
  ]);
  const query = first(searchParams.q);
  const scopeValue = first(searchParams.scope);
  const scope = scopeValue === "current" || scopeValue === "historical" ? scopeValue : "all";
  const status = first(searchParams.status);
  const platform = first(searchParams.platform);
  const requestedPage = Number(first(searchParams.page));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const selectedId = first(searchParams.product);
  const selected = current.find((item) => item.offering.id === selectedId);
  const tokens = normalized(query).split(" ").filter(Boolean);
  const all: SyntheticArtCatalogItem[] = [
    ...(scope === "historical" ? [] : current),
    ...(scope === "current" ? [] : historical),
  ];
  const filtered = all.filter((item) =>
    (!status || itemStatus(item) === status) &&
    (!platform || itemPlatform(item) === platform) &&
    tokens.every((token) => itemText(item).includes(token))
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const platforms = [...new Map(current.map((item) => [item.platform.id, item.platform])).values()];
  const statusOptions = scope === "current"
    ? [...new Set(current.map((item) => item.offering.status))]
    : scope === "historical"
      ? [...new Set(historical.map((item) => item.record.status))]
      : [];
  const base = {
    scope: scope === "all" ? undefined : scope,
    q: query || undefined,
    status: status || undefined,
    platform: platform || undefined,
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>ART CATALOG · SYNTHETIC</p>
          <h1>미술품 상품·과거 이력</h1>
          <p>합성 현재 상품 9건과 합성 과거 이력 318건을 검색하고, 상품 조건과 회수 이력을 구분해 검토합니다.</p>
        </div>
        <aside><strong>합성 데이터 전용</strong><span>실제 투자 상품이나 거래 이력이 아닙니다.</span></aside>
      </header>

      {selected ? <CurrentProductDetail product={selected} /> : null}

      <nav className={styles.scopeTabs} aria-label="미술품 데이터 범위">
        <Link href={href({ q: query || undefined })} aria-current={scope === "all" ? "page" : undefined}>전체 <span>{current.length + historical.length}</span></Link>
        <Link href={href({ scope: "current", q: query || undefined })} aria-current={scope === "current" ? "page" : undefined}>현재 상품 <span>{current.length}</span></Link>
        <Link href={href({ scope: "historical", q: query || undefined })} aria-current={scope === "historical" ? "page" : undefined}>과거 이력 <span>{historical.length}</span></Link>
      </nav>

      <form action="/art" method="get" className={styles.searchForm}>
        {scope !== "all" ? <input type="hidden" name="scope" value={scope} /> : null}
        <label><span>상품·작품·가상 작가 검색</span><input type="search" name="q" defaultValue={query} placeholder="예: 10만원 이하 작품, 루메라, 청산 완료" /></label>
        <label><span>가상 플랫폼</span><select name="platform" defaultValue={platform}><option value="">전체</option>{platforms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {statusOptions.length ? <label><span>상태</span><select name="status" defaultValue={status}><option value="">전체</option>{statusOptions.map((item) => <option key={item} value={item}>{CURRENT_STATUS[item] ?? HISTORY_STATUS[item] ?? item}</option>)}</select></label> : null}
        <button type="submit">검색</button>
      </form>

      <div className={styles.resultMeta} aria-live="polite">
        <strong>{filtered.length.toLocaleString("ko-KR")}건</strong>
        <span>{safePage} / {pageCount} 페이지</span>
        {(query || status || platform) ? <Link href={href({ scope: scope === "all" ? undefined : scope })}>조건 초기화</Link> : null}
      </div>

      {pageItems.length ? (
        <section className={styles.grid} aria-label="미술품 카탈로그 검색 결과">
          {pageItems.map((item) => item.kind === "current"
            ? <CurrentCard key={item.offering.id} product={item} query={query} />
            : <HistoricalCard key={item.record.id} item={item} />)}
        </section>
      ) : <p className={styles.empty}>조건에 맞는 합성 상품·과거 이력이 없습니다.</p>}

      {pageCount > 1 ? (
        <nav className={styles.pagination} aria-label="미술품 카탈로그 페이지">
          {safePage > 1 ? <Link href={href({ ...base, page: String(safePage - 1) })}>← 이전</Link> : <span />}
          <span>{safePage} / {pageCount}</span>
          {safePage < pageCount ? <Link href={href({ ...base, page: String(safePage + 1) })}>다음 →</Link> : <span />}
        </nav>
      ) : null}
      <p className={styles.footerNotice}>{SYNTHETIC_ART_LIMITATION}</p>
    </main>
  );
}
