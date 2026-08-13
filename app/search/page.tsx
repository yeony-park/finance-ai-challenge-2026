import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { products, searchProducts } from "@/lib/catalog";

type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const value = (await searchParams).q;
  const query = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const results = searchProducts(query);
  const hasQuery = query.trim().length > 0;

  return (
    <main className="catalog-page shell">
      <header className="page-heading">
        <p className="section-label">PRODUCT SEARCH</p>
        <h1>상품 통합 검색</h1>
        <p>이름, 운영·발행 관련 기관, 상태, 자산 유형, 식별자로 {products.length}개 저장본을 검색합니다.</p>
      </header>
      <SearchForm action="/search" defaultValue={query} label="상품 검색" placeholder="예 : 김환기, SOU, 거래 중단" />
      {!hasQuery ? <p className="empty-state">검색어를 입력하면 일치하는 상품만 표시합니다.</p> : null}
      {hasQuery ? (
        <section className="results-section" aria-live="polite" aria-labelledby="result-title">
          <div className="results-heading"><h2 id="result-title">“{query.trim()}” 검색 결과</h2><span>{results.length}개</span></div>
          {results.length ? <div className="product-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="empty-state">일치하는 상품이 없습니다. 저장본의 상품명, 기관명, 상태 또는 자산 유형으로 다시 검색해 주세요.</p>}
        </section>
      ) : null}
    </main>
  );
}
