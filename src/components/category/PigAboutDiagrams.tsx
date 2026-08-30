import Image from "next/image";

import s from "./CategoryAboutDiagrams.module.css";

export function PigDisclosureOverviewDiagram() {
  return (
    <Image
      src="/pig-disclosure-overview.svg"
      alt="DART 공시 3개 회차를 기준으로 회차와 가격, 시장 참고값을 정리하고 개체 이력번호가 없어 원장 대조는 불가함을 보여주는 도식"
      width={1130}
      height={328}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}

export function PigAnalysisScopeDiagram() {
  return (
    <Image
      src="/pig-analysis-scope.svg"
      alt="공시 원문과 돼지 경락가 월 통계를 대조해 확인한 범위와 개체 원장 등 현재 확인할 수 없는 범위를 근거에 연결하는 도식"
      width={1126}
      height={330}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 27rem"
      unoptimized
      className={s.diagramImage}
    />
  );
}
