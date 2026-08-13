import Link from "next/link";
import { CatalogProduct, formatKrw, productReviewReason } from "@/lib/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="product-card">
      <div className="product-card-topline">
        <span className="category-chip">{product.category}</span>
        <span className="as-of">기준일 : {product.as_of}</span>
      </div>
      <h2>{product.name}</h2>
      <p className="product-issuer">운영·발행 관련 표기 : {product.issuer}</p>
      <dl className="product-metadata">
        <div><dt>공모금액</dt><dd>{formatKrw(product.offering?.amount)}</dd></div>
        <div><dt>상태</dt><dd>{product.status}</dd></div>
      </dl>
      <p className="product-source">출처 상태 : {product.source_state}</p>
      <p className="product-caution">{productReviewReason(product)}</p>
      <Link className="detail-link" href={`/products/${product.id}`}>근거와 상세 보기 <span aria-hidden="true">→</span></Link>
    </article>
  );
}
