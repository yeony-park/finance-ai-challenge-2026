import { SearchForm } from "@/components/search-form";
import { platformRecords, platformRecordSources, searchTrackRecords, trackRecordsAsOf, type PlatformRecordMoney } from "@/lib/catalog";

type TrackRecordsPageProps = { searchParams: Promise<{ q?: string | string[] }> };

function formatSourceMoney(value: PlatformRecordMoney) {
  const amount = new Intl.NumberFormat("ko-KR").format(value.amount);
  return value.currency === "KRW" ? `${amount}원` : value.currency ? `${amount} ${value.currency}` : amount;
}

function formatSourceDate(value: string) {
  return value.replace("T", " ");
}

export default async function TrackRecordsPage({ searchParams }: TrackRecordsPageProps) {
  const value = (await searchParams).q;
  const query = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const hasQuery = query.trim().length > 0;
  const results = searchTrackRecords(query);

  return (
    <main className="catalog-page shell track-record-page">
      <header className="page-heading">
        <p className="section-label">PLATFORM RECORD DATABASE</p>
        <h1>플랫폼 자체 게시 이력 검색</h1>
        <p>[팩트] 아래 저장본은 각 플랫폼이 자체 게시한 기록입니다. 합계 {platformRecords.length}건이며, 매각 계약서·입금·정산 자료를 제삼자 원자료로 독립 검증하지 않았습니다.</p>
        <div className="track-source-counts" aria-label="출처별 저장 건수">
          {platformRecordSources.map((source) => <span key={source.key}>{source.platform} {source.count}건</span>)}
        </div>
        <p className="as-of">저장본 기준 시각 : {trackRecordsAsOf}</p>
      </header>
      <SearchForm action="/track-records" defaultValue={query} label="플랫폼 자체 게시 이력 검색" placeholder="출처, 식별자, 작가, 작품명, 상태, 날짜 또는 매각 방식 검색" />
      {!hasQuery ? <p className="empty-state">검색어를 입력하면 일치하는 기록만 표시합니다. 공백으로 나눈 검색어는 모두 일치해야 합니다.</p> : null}
      {hasQuery ? <section className="results-section" aria-live="polite">
        <div className="results-heading"><h2>“{query.trim()}” 검색 결과</h2><span>{results.length}건</span></div>
        {results.length ? <div className="track-record-list">{results.map((record) => <article className="track-record-card" key={record.id}>
          <div className="track-record-topline">
            <span className="category-chip">{record.platform}</span>
            <span className="as-of">식별자 : {record.id}</span>
          </div>
          <p className="track-record-source">출처 : {record.sourceLabel}</p>
          <h2>{record.title}</h2>
          <p>{record.artist ?? "작가 미기재"}</p>
          <dl className="track-record-facts">
            {record.status ? <div><dt>원문 상태</dt><dd>{record.status}</dd></div> : null}
            {record.category ? <div><dt>원문 분류</dt><dd>{record.category}</dd></div> : null}
            {record.locationOrMethod ? <div><dt>원문 장소·방식</dt><dd>{record.locationOrMethod}</dd></div> : null}
            {record.dates.map((date) => <div key={`${date.label}-${date.value}`}><dt>{date.label}</dt><dd>{formatSourceDate(date.value)}</dd></div>)}
            {record.money.map((amount) => <div key={`${amount.label}-${amount.amount}`}><dt>{amount.label}</dt><dd>{formatSourceMoney(amount)}</dd></div>)}
          </dl>
          {record.sourceUrl ? <a className="track-record-link" href={record.sourceUrl} rel="noreferrer" target="_blank">원문 출처 열기</a> : <p className="record-note">원문 URL이 저장본에 없습니다.</p>}
          <p className="record-note">[팩트] {record.platform}의 first-party/self-reported 게시값입니다. 매각 사실과 금액, 정산은 독립 검증하지 않았습니다.</p>
        </article>)}</div> : <p className="empty-state">일치하는 기록이 없습니다. 출처, 식별자, 작가, 작품명, 원문 상태·분류, 날짜 또는 장소·방식으로 다시 검색해 주세요.</p>}
      </section> : null}
    </main>
  );
}
