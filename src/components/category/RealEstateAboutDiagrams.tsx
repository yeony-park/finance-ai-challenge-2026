import Image from "next/image";

import s from "./CategoryAboutDiagrams.module.css";

export function RealEstateVerificationOverviewDiagram() {
  return (
    <Image
      src="/real-estate-verification-overview.svg"
      alt="종료된 부동산 공모의 공모 공고와 매각 공시를 기준으로 건축물대장 표제부의 건물 단위 실재, 국토부 실거래 신고 비교군의 공모가·매각가 위치와 매각금액·매각일을 대조하는 도식"
      width={1130}
      height={328}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}

export function RealEstateAnalysisScopeDiagram() {
  return (
    <Image
      src="/real-estate-analysis-scope.svg"
      alt="공모 공고·매각 공시와 공공 원장을 연결해 건물 단위 실재와 총액 기준 가격 위치, 매각 내역을 대조하고 층·호 소유 구조·제곱미터 단가·DART 정정 계보는 확인이 제한됨을 보여주는 도식"
      width={1126}
      height={330}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}
