import Image from "next/image";

import s from "./CategoryAboutDiagrams.module.css";

export function ArtDisclosureOverviewDiagram() {
  return (
    <Image
      src="/art-disclosure-overview.svg"
      alt="DART 공시의 미술품 투자계약증권 5건을 신고서, 투자설명서, 발행실적보고서와 공모가 구성으로 정리하고 독립 경매·보관 원장은 연결되지 않아 대조할 수 없음을 보여주는 도식"
      width={1130}
      height={328}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}

export function ArtAnalysisScopeDiagram() {
  return (
    <Image
      src="/art-analysis-scope.svg"
      alt="공시 원문에 적힌 공모가 구성 항목을 검산해 문서 좌표와 공모금액, 구성 산식을 확인하고 독립 경매 낙찰·현재 보관·처분과 회수는 현재 확인할 수 없는 범위로 표시한 도식"
      width={1126}
      height={330}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}
