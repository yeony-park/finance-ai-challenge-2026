import {
  dartDocumentUrl,
  type PigDisclosureProduct,
} from "@/lib/content/pig";

import s from "./pig.module.css";

interface PigDisclosureSummaryProps {
  readonly products: readonly PigDisclosureProduct[];
}

const formatAmount = (value: number): string =>
  `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;

const settlementLabel = (product: PigDisclosureProduct): string => {
  if (!product.settlement.completed) return "최종 정산 공시 없음";
  return `정산 ${product.settlement.completedAt} · ${product.settlement.realizedReturnPercent?.toFixed(1)}%`;
};

export function PigDisclosureSummary({ products }: PigDisclosureSummaryProps) {
  const totalAmount = products.reduce(
    (sum, product) => sum + product.offering.issueAmountWon,
    0,
  );
  const totalHeads = products.reduce(
    (sum, product) => sum + product.offering.heads,
    0,
  );
  const documentCount = products.reduce(
    (sum, product) => sum + product.documents.length,
    0,
  );
  const completedCount = products.filter((product) => product.settlement.completed).length;

  return (
    <section className={s.snapshot} aria-labelledby="pig-snapshot-title">
      <div className={s.sectionHeading}>
        <div>
          <p className={s.sectionLabel}>공시 데이터 전체 보기</p>
          <h3 className={s.sectionTitle} id="pig-snapshot-title">
            3개 회차를 같은 기준으로 펼쳐 봅니다
          </h3>
          <p className={s.sectionDescription}>
            회차별 발행 조건·가격 기준·정산 공개 여부와 원문을 한 줄씩 놓았습니다.
            아래에서 회차를 선택하면 세부 분석을 이어서 볼 수 있습니다.
          </p>
        </div>
        <span className={s.badge}>DART 공시 기준</span>
      </div>

      <dl className={s.snapshotMetrics}>
        <div>
          <dt>공시 회차</dt>
          <dd>{products.length}개</dd>
        </div>
        <div>
          <dt>기초자산 합계</dt>
          <dd>{totalHeads.toLocaleString("ko-KR")}두</dd>
        </div>
        <div>
          <dt>발행금액 합계</dt>
          <dd>{formatAmount(totalAmount)}</dd>
        </div>
        <div>
          <dt>정산 공개</dt>
          <dd>{completedCount}개 회차</dd>
        </div>
        <div>
          <dt>원문 링크</dt>
          <dd>{documentCount}건</dd>
        </div>
      </dl>

      <div className={s.snapshotTableWrap}>
        <table className={s.snapshotTable}>
          <thead>
            <tr>
              <th scope="col">회차</th>
              <th scope="col">기초자산 · 발행금액</th>
              <th scope="col">공시 기준가격</th>
              <th scope="col">정산 공개</th>
              <th scope="col">DART 원문</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <th scope="row">제{product.round}호</th>
                <td>
                  {product.offering.heads.toLocaleString("ko-KR")}두 · {formatAmount(product.offering.issueAmountWon)}
                </td>
                <td>
                  {product.pricing.baselineMonth} · {product.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}원/kg
                </td>
                <td>{settlementLabel(product)}</td>
                <td>
                  <span className={s.documentChips}>
                    {product.documents.map((document) => (
                      <a
                        key={document.rceptNo}
                        href={dartDocumentUrl(document.rceptNo)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {document.label}
                      </a>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
