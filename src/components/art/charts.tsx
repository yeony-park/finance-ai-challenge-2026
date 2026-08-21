import type { ProductView, TrackRecord, TrackStatus } from "@/lib/art/types";
import { formatKrw } from "@/lib/art/calculations";

import s from "./art.module.css";

const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  offering: "모집 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  returned: "반환",
  liquidated: "청산 완료",
  delayed: "지연 청산",
  unsold: "미매각",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

function trackOfferingAmount(record: TrackRecord) {
  return record.offeringAmount != null
    ? formatKrw(record.offeringAmount)
    : record.reportedAmount != null
      ? `${record.reportedAmount.toLocaleString("ko-KR")} (통화 미기재)`
      : "공개되지 않음";
}

function rawStatusEvidence(record: TrackRecord) {
  const values = [
    record.rawStatus ? `코드 : ${record.rawStatus}` : null,
    record.rawStatusLabel ? `표기 : ${record.rawStatusLabel}` : null,
    record.statusConflict ? "상태 표기 충돌" : null,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : null;
}

export function ComparablePriceChart({ product }: { product: ProductView }) {
  const sold = product.comparables.filter(
    (comparable) =>
      comparable.auction.result === "sold" &&
      comparable.auction.normalizedPriceKRW != null,
  );
  if (!sold.length)
    return <div className={s.chartEmpty}>비교 가능한 낙찰 데이터가 없습니다.</div>;

  const prices = sold.map(
    (comparable) => comparable.auction.normalizedPriceKRW as number,
  );
  const max = Math.max(product.offering.totalOfferingAmount ?? 0, ...prices);
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>유사 작품 낙찰가 분포</strong>
        <span>단위 : 억원</span>
      </figcaption>
      <div
        className={s.scatter}
        role="img"
        aria-label={sold
          .map(
            (comparable) =>
              `${comparable.auction.auctionDate} ${comparable.auction.normalizedPriceKRW}원`,
          )
          .join(", ")}
      >
        <span
          className={s.offeringLine}
          style={{
            bottom: `${((product.offering.totalOfferingAmount ?? 0) / max) * 100}%`,
          }}
        >
          현재 공모가
        </span>
        {sold.map((comparable, index) => (
          <i
            key={comparable.id}
            className={comparable.sameSeries ? s.sameSeries : s.otherSeries}
            style={{
              left: `${8 + (index / (sold.length - 1 || 1)) * 84}%`,
              bottom: `${((comparable.auction.normalizedPriceKRW as number) / max) * 88}%`,
            }}
            title={`${comparable.auction.artworkTitle} ${formatKrw(comparable.auction.normalizedPriceKRW)}`}
          />
        ))}
      </div>
      <div className={s.chartLegend}>
        <span>
          <i className={s.legendSame} />
          동일 시리즈
        </span>
        <span>
          <i className={s.legendOther} />
          다른 시리즈
        </span>
      </div>
      <p className={s.chartSummary}>
        동일 작가라도 시리즈·재료·크기가 다른 거래는 별도로 표시합니다.
      </p>
    </figure>
  );
}

export function AuctionResultChart({ product }: { product: ProductView }) {
  const latest = product.annualMetrics.at(-1);
  const sold =
    latest?.sold ??
    product.auctions.filter((auction) => auction.result === "sold").length;
  const unsold =
    latest?.unsold ??
    product.auctions.filter((auction) => auction.result === "unsold").length;
  const total = sold + unsold;
  if (!total)
    return (
      <div className={s.chartEmpty}>
        <strong>낙찰·유찰 집계 없음</strong>
        <p>발행인 기재 사례 수를 독립 경매 집계로 대체하지 않았습니다.</p>
      </div>
    );
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>낙찰·유찰 분포</strong>
        <span>총 {total}건</span>
      </figcaption>
      <div className={s.resultBar}>
        <span className={s.resultSold} style={{ width: `${(sold / total) * 100}%` }}>
          낙찰 {sold}
        </span>
        <span
          className={s.resultUnsold}
          style={{ width: `${(unsold / total) * 100}%` }}
        >
          유찰 {unsold}
        </span>
      </div>
      <p className={s.chartSummary}>
        낙찰률 {((sold / total) * 100).toFixed(1)}%, 유찰률{" "}
        {((unsold / total) * 100).toFixed(1)}%입니다.
      </p>
    </figure>
  );
}

export function ComparableSalesTable({ product }: { product: ProductView }) {
  return (
    <div className={s.tableWrap}>
      <table>
        <caption className={s.srOnly}>유사 작품 거래 목록</caption>
        <thead>
          <tr>
            <th>거래일</th>
            <th>작품명</th>
            <th>경매사</th>
            <th>재료·크기</th>
            <th>결과</th>
            <th>낙찰가</th>
            <th>유사성</th>
          </tr>
        </thead>
        <tbody>
          {product.comparables.map((comparable) => (
            <tr key={comparable.id}>
              <td>{comparable.auction.auctionDate}</td>
              <td>{comparable.auction.artworkTitle}</td>
              <td>{comparable.auction.auctionHouse}</td>
              <td>
                {comparable.auction.medium}
                <br />
                {comparable.auction.width}×{comparable.auction.height}cm
              </td>
              <td>
                {comparable.auction.result === "sold"
                  ? "낙찰"
                  : comparable.auction.result === "unsold"
                    ? "유찰"
                    : comparable.auction.result === "withdrawn"
                      ? "취소"
                      : "결과 미확인"}
              </td>
              <td>
                {comparable.auction.normalizedPriceKRW != null
                  ? formatKrw(comparable.auction.normalizedPriceKRW)
                  : comparable.auction.reportedPrice != null
                    ? `${comparable.auction.reportedPrice.toLocaleString("ko-KR")} ${comparable.auction.currency} (기재값)`
                    : "공개되지 않음"}
              </td>
              <td>
                {Math.round(comparable.similarityScore * 100)}%
                <br />
                <small>{comparable.comparisonReason}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrackRecordTable({ product }: { product: ProductView }) {
  const rows = product.trackRecords.slice(0, 10);
  return (
    <>
      <div className={s.tableWrap}>
        <table>
          <caption className={s.srOnly}>플랫폼 과거 상품 목록</caption>
          <thead>
            <tr>
              <th>상품명</th>
              <th>기초 작품</th>
              <th>공모금액</th>
              <th>목표/실제</th>
              <th>총 배당</th>
              <th>매각금액</th>
              <th>최종 상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id}>
                <td>
                  {record.sourceUrl ? (
                    <a
                      href={record.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {record.productName} ↗
                    </a>
                  ) : (
                    record.productName
                  )}
                </td>
                <td>{record.artworkTitle}</td>
                <td>{trackOfferingAmount(record)}</td>
                <td>
                  {record.targetHoldingMonths ?? "-"}/
                  {record.actualHoldingMonths == null
                    ? "-"
                    : record.actualHoldingMonths.toFixed(1)}
                  개월
                </td>
                <td>{formatKrw(record.totalDistribution)}</td>
                <td>
                  {record.exitAmount == null
                    ? "공개되지 않음"
                    : record.exitCurrency === "KRW" || !record.exitCurrency
                      ? formatKrw(record.exitAmount)
                      : `${record.exitAmount.toLocaleString("ko-KR")} ${record.exitCurrency}`}
                </td>
                <td>
                  {TRACK_STATUS_LABELS[record.status]}
                  {rawStatusEvidence(record) ? (
                    <>
                      <br />
                      <small>원문 : {rawStatusEvidence(record)}</small>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {product.trackRecords.length > rows.length ? (
        <p className={s.tableNote}>
          최근 연결 레코드 {rows.length}건만 표시합니다. 전체{" "}
          {product.trackRecords.length}건은 플랫폼 상세에서 확인할 수 있습니다.
        </p>
      ) : null}
    </>
  );
}

export function PlatformRecordOutcomeChart({
  records,
}: {
  records: TrackRecord[];
}) {
  const groups: Array<{ key: TrackStatus; label: string }> = [
    { key: "offering", label: "모집 중" },
    { key: "operating", label: "운용 중" },
    { key: "exit_in_progress", label: "매각 진행" },
    { key: "sold", label: "매각 완료" },
    { key: "returned", label: "반환" },
    { key: "liquidated", label: "청산 완료" },
    { key: "delayed", label: "지연 청산" },
    { key: "unsold", label: "미매각" },
    { key: "loss_confirmed", label: "손실 확인" },
    { key: "unknown", label: "상태 미확인" },
  ];
  const populated = groups
    .map((group) => ({
      ...group,
      count: records.filter((record) => record.status === group.key).length,
    }))
    .filter((group) => group.count > 0);
  const total = Math.max(records.length, 1);
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>연결 DB 상태 분포</strong>
        <span>총 {records.length}건</span>
      </figcaption>
      <div className={s.outcomeBar}>
        {populated.map((group) => (
          <span
            key={group.key}
            className={s.outcomeSeg}
            style={{ width: `${(group.count / total) * 100}%` }}
          >
            {group.label} {group.count}
          </span>
        ))}
      </div>
      <ul className={s.chartDataList}>
        {populated.map((group) => (
          <li key={group.key}>
            <span>{group.label}</span>
            <strong>{group.count}건</strong>
          </li>
        ))}
      </ul>
      <p className={s.chartSummary}>
        매각 완료·반환·청산 완료를 분리하며, 상태 표기 충돌은 원문 상태와 함께
        보존합니다.
      </p>
    </figure>
  );
}

export function ExitTimelineChart({ product }: { product: ProductView }) {
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>매각·청산 타임라인</strong>
        <span>목표 24개월 기준</span>
      </figcaption>
      <div className={s.timeline}>
        {product.trackRecords
          .filter((record) => record.actualHoldingMonths != null)
          .slice(0, 5)
          .map((record) => (
            <div key={record.id}>
              <span>{record.productName}</span>
              <i
                style={{
                  width: `${Math.min(100, ((record.actualHoldingMonths ?? 0) / 36) * 100)}%`,
                }}
                className={(record.delayDays ?? 0) > 0 ? s.delayed : s.ontime}
              />
              <b>
                {record.actualHoldingMonths}개월 ·{" "}
                {(record.delayDays ?? 0) > 0
                  ? `${record.delayDays}일 지연`
                  : "기간 내"}
              </b>
            </div>
          ))}
      </div>
      <p className={s.chartSummary}>
        매각일과 청산일을 구분해 실제 보유기간을 집계했습니다.
      </p>
    </figure>
  );
}
