/**
 * 리포트 하단 — 이 문서가 무엇에 근거했고 무엇을 말하지 않는지 못 박는 자리.
 * 판정 기준 전문은 /methodology가 갖고 있으므로 여기서는 근거·한계 고지와 이동 경로만 둔다.
 */
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { DATA_SOURCES } from "@/components/site/service";

import { IconInfo } from "./icons";
import s from "./report.module.css";

const FOOT_HEADING_ID = "report-foot-heading";

export function ReportFoot() {
  return (
    <section className={s.section} aria-labelledby={FOOT_HEADING_ID}>
      <Reveal className={s.wrap}>
        <h2 id={FOOT_HEADING_ID} className={s.footHead}>
          이 리포트의 근거와 한계
        </h2>

        <div className={s.footBody}>
          <p>
            모든 판정에는 신고서 원문의 위치와 공공 데이터 조회 응답이 근거로 붙어 있습니다. 근거가
            없는 항목에는 판정이 붙지 않고 대조 불가로 남습니다.
          </p>
          <p>
            &ldquo;원장 미확인&rdquo;은 조회 시점의 공개 기록에서 확인되지 않았다는 사실만을
            뜻하며, 그 원인은 판정 대상이 아닙니다. 화면에 표시되는 발행사명·이력번호·소재지는
            익명화 처리된 상태입니다.
          </p>
          <p>
            이 리포트는 공시와 공공 데이터의 일치 여부만 표시하며 투자 권유나 가치 평가가 아닙니다.
          </p>
        </div>

        <div className={s.footSources}>
          {DATA_SOURCES.map((source) => (
            <p key={source.name}>
              출처 · {source.name} ({source.holder})
            </p>
          ))}
        </div>

        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>
            공공 데이터는 계속 갱신됩니다. 같은 항목이 다른 시점에는 다르게 확인될 수 있어,
            리포트에는 조회 시각이 함께 적혀 있습니다.
          </span>
        </div>

        <div className={s.footLinks}>
          <Link href="/methodology" className={s.buttonGhost}>
            판정 기준과 한계 읽기
          </Link>
          <Link href="/" className={s.buttonGhost}>
            <span aria-hidden="true">←</span>
            공개된 검증 리포트 목록
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
