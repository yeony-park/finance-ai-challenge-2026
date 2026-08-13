import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { catalogAsOf, products, trackRecordsAsOf } from "@/lib/catalog";

export default function Home() {
  const realEstateCount = products.filter((product) => product.category === "부동산").length;
  const artCount = products.filter((product) => product.category === "미술품").length;

  return (
    <main className="catalog-main">
      <section className="catalog-hero">
        <div className="shell catalog-hero-content">
          <p className="hero-kicker">JEOMJEOM · LOCAL EVIDENCE CATALOG</p>
          <h1>조각투자 정보를<br /><span>근거와 함께 찾습니다.</span></h1>
          <p>
            로컬 저장본에 있는 상품의 상태, 기준일, 원문 출처를 검색합니다. 이 화면은 투자 권유나 가격 적정성 판단을 제공하지 않습니다.
          </p>
          <SearchForm action="/search" label="상품 통합 검색" placeholder="상품명, 발행 관련 기관, 자산 유형으로 검색" buttonLabel="상품 검색" />
          <div className="catalog-stats" aria-label="저장본 범위">
            <span>상품 {products.length}개</span>
            <span>부동산 {realEstateCount}개 · 미술품 {artCount}개</span>
            <span>상품 저장본 기준일 : {catalogAsOf}</span>
          </div>
        </div>
      </section>

      <section className="shell overview-links" aria-labelledby="overview-title">
        <div className="section-intro">
          <p className="section-label">SEARCH ENTRY</p>
          <h2 id="overview-title">필요한 데이터베이스로 이동</h2>
          <p>검색어를 입력한 뒤 결과를 확인합니다. 초기 진입 화면에는 전체 상품이나 전체 이력 목록을 표시하지 않습니다.</p>
        </div>
        <div className="overview-link-grid">
          <Link href="/search" className="overview-link-card">
            <span>01</span><h3>상품 통합 검색</h3><p>{products.length}개 로컬 상품 저장본을 상품명·기관·상태·자산 유형으로 찾습니다.</p><strong>검색 열기 →</strong>
          </Link>
          <Link href="/track-records" className="overview-link-card">
            <span>02</span><h3>플랫폼 기록 검색</h3><p>아트앤가이드·아트투게더·TESSA 자체 게시 이력 저장본을 작가·작품·상태·식별자로 찾습니다.</p><strong>기준 시각 : {trackRecordsAsOf.slice(0, 10)} →</strong>
          </Link>
          <Link href="/suitability" className="overview-link-card">
            <span>03</span><h3>자료 확인 문항</h3><p>중립적 확인 문항으로 자료 검토 전 유의사항을 점검합니다.</p><strong>문항 보기 →</strong>
          </Link>
        </div>
      </section>
    </main>
  );
}
