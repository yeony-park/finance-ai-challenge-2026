import Image from "next/image";

import s from "./CattleAboutDiagrams.module.css";

export function CattleCrossCheckDiagram() {
  return (
    <Image
      src="/cattle-disclosure-cross-check.png"
      alt="증권신고서를 기준으로 축산물이력제 원장 대조, 공모가의 시장 위치, 정정 이력을 확인하는 도식"
      width={1130}
      height={328}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 50vw"
      unoptimized
      className={s.diagramImage}
    />
  );
}

export function AnalysisEvidenceDiagram() {
  return (
    <Image
      src="/cattle-analysis-evidence.png"
      alt="공시 원문과 공공 자료를 대조해 대조 결과와 현재 확인할 수 없는 범위를 근거에 연결하는 도식"
      width={1126}
      height={330}
      sizes="(max-width: 900px) calc(100vw - 2.25rem), 50vw"
      unoptimized
      className={s.diagramImage}
    />
  );
}
