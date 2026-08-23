import { ART_DEMO_METHODOLOGY } from "@/lib/art/methodology-content";

import s from "./art-demo-methodology.module.css";

/** A separate appendix for the synthetic art-offer analysis demonstration. */
export function ArtDemoMethodologySection() {
  const methodology = ART_DEMO_METHODOLOGY;

  return (
    <section
      id={methodology.anchor}
      className={s.appendix}
      aria-labelledby="art-analysis-demo-title"
    >
      <header className={s.header}>
        <p className={s.eyebrow}>ART ANALYSIS DEMO · APPENDIX</p>
        <h2 id="art-analysis-demo-title" className={s.title}>
          {methodology.title}
        </h2>
        <p className={s.intro}>{methodology.intro}</p>
      </header>

      <aside className={s.notice} aria-label="데모 범위 안내">
        <strong>DEMO 전용</strong>
        <p>
          실제 청약 상품이나 공시·공공 원장 대조 리포트가 아닙니다. 기존 커버리지와 검증 완료
          건수에 포함하지 않으며, 투자 권유·매수·매도 조언 또는 수익 예측을 제공하지 않습니다.
        </p>
      </aside>

      <section className={s.section} aria-labelledby="art-demo-axes-title">
        <h3 id="art-demo-axes-title" className={s.sectionTitle}>
          네 개 분석축
        </h3>
        <ol className={s.axisList}>
          {methodology.axes.map((axis) => (
            <li key={axis.key} className={s.axis}>
              <h4>{axis.title}</h4>
              <p>{axis.description}</p>
              <div className={s.evidence}>
                <strong>근거 범위</strong>
                <ul>
                  {axis.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.section} aria-labelledby="art-demo-grades-title">
        <h3 id="art-demo-grades-title" className={s.sectionTitle}>
          네 개 분석 등급
        </h3>
        <p className={s.supportingText}>
          아래 등급은 고정된 DEMO 표시 레이블입니다. 현재 코드는 네 분석축에서 이 네 레이블을
          산출하거나 다시 계산하지 않습니다. 기존 공개기록 검증의 ‘일치·원장 불일치·대조 불가’ 세
          값과도 같지 않습니다.
        </p>
        <dl className={s.gradeList}>
          {methodology.verdicts.map((verdict) => (
            <div key={verdict.key} className={s.grade}>
              <dt>{verdict.label}</dt>
              <dd>{verdict.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={s.section} aria-labelledby="art-demo-boundaries-title">
        <h3 id="art-demo-boundaries-title" className={s.sectionTitle}>
          자료와 설명의 경계
        </h3>
        <dl className={s.boundaryList}>
          <div>
            <dt>누락 자료</dt>
            <dd>값이 없으면 0이나 추정값으로 채우지 않습니다. 비교 표본·식별·현재 상태가 부족하면 판정 보류 또는 확인 불가로 남깁니다.</dd>
          </div>
          <div>
            <dt>사실과 계산</dt>
            <dd>원문·공식 자료에서 확인한 사실과 화면이 공개값으로 계산한 결과를 구분합니다. 계산은 입력값과 식을 확인할 수 있는 범위에 한정합니다.</dd>
          </div>
          <div>
            <dt>저장 결과와 AI</dt>
            <dd>등급은 저장된 AnalysisResult 표시값(해볼 만함·조건부 해볼 만함·주의·위험)입니다. 네 분석축은 이 값을 자동 계산하지 않습니다. AI는 연결된 근거와 저장 결과를 설명할 뿐, 확인되지 않은 사실을 만들거나 투자 결론을 대신하지 않습니다.</dd>
          </div>
        </dl>
      </section>

      <section className={s.section} aria-labelledby="art-demo-principles-title">
        <h3 id="art-demo-principles-title" className={s.sectionTitle}>
          적용 원칙
        </h3>
        <dl className={s.principleList}>
          {methodology.principles.map((principle) => (
            <div key={principle.title}>
              <dt>{principle.title}</dt>
              <dd>{principle.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className={s.footer}>
        <p>
          <strong>방법 버전</strong> {methodology.version}
        </p>
        <div>
          <strong>출처 우선순위</strong>
          <ol>
            {methodology.sourcePriority.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ol>
        </div>
      </footer>
    </section>
  );
}
