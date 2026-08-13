import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKrw, products, productReviewReason } from "@/lib/catalog";

type ProductPageProps = { params: Promise<{ id: string }> };

const assetFactLabels: Record<string, string> = {
  address: "주소",
  artist: "작가",
  artist_name: "작가",
  asset_type: "자산 유형",
  bcr_pct: "건폐율",
  completion_date: "사용승인일",
  far_pct: "용적률",
  floors: "층수",
  gross_floor_area_m2: "연면적",
  material: "재료",
  site_area_m2: "대지면적",
  size: "크기",
  title: "작품명",
  use: "용도",
  year: "제작연도",
  zoning: "용도지역",
};

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  const assetFacts = Object.entries(product.asset ?? {})
    .flatMap(([key, value]) => {
      const label = assetFactLabels[key];
      return label && ["string", "number"].includes(typeof value) ? [[key, label, String(value)] as const] : [];
    })
    .slice(0, 5);
  const cardFact = product.common_model?.comments?.card?.text;

  return (
    <main className="catalog-page shell product-detail-page">
      <Link className="back-link" href="/search">← 상품 검색으로</Link>
      <header className="detail-hero">
        <div><p className="section-label">{product.category} · {product.source_state}</p><h1>{product.name}</h1><p>{product.status_detail ?? product.status}</p></div>
        <aside><span>저장본 기준일</span><strong>{product.as_of}</strong><small>실시간 상태가 아닐 수 있습니다.</small></aside>
      </header>
      <section className="detail-summary" aria-label="상품 기본 정보">
        <div><span>운영·발행 관련 표기</span><strong>{product.issuer}</strong></div>
        <div><span>공모금액</span><strong>{formatKrw(product.offering?.amount)}</strong></div>
        <div><span>표시 상태</span><strong>{product.status}</strong></div>
      </section>
      <section className="detail-card" aria-labelledby="review-title">
        <p className="section-label">REVIEW BOUNDARY</p><h2 id="review-title">검토 상태 : 판정 보류</h2>
        <p>{productReviewReason(product)}</p>
        {cardFact ? <p className="fact-callout">{cardFact}</p> : null}
        <p className="detail-note">[팩트] 이 화면은 저장된 공시·플랫폼·원문 검증 자료의 표기입니다. 가격 적정성, 매수·매도 여부, 예상 수익은 표시하지 않습니다.</p>
      </section>
      {assetFacts.length ? <section className="detail-card" aria-labelledby="asset-title"><p className="section-label">ASSET FACTS</p><h2 id="asset-title">기초자산 표기</h2><dl className="detail-facts">{assetFacts.map(([key, label, value]) => <div key={key}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : null}
      <section className="detail-card" aria-labelledby="sources-title">
        <p className="section-label">SOURCE PROVENANCE</p><h2 id="sources-title">원문과 저장본 출처</h2>
        <p className="detail-note">출처별 기준일이 다를 수 있습니다. 링크는 원문 확인용이며, 각 제공자의 이용조건은 별도로 확인해야 합니다.</p>
        <div className="source-list">{product.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.label}</span><strong>{source.document_name ?? source.publisher ?? source.id}</strong><small>기준일 : {source.as_of ?? "확인 불가"} · 원문 열기 ↗</small></a>)}</div>
      </section>
    </main>
  );
}
