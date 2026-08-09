/**
 * 주제 전환 중 임시 화면 (2026-08-08).
 * 이전 주제(약관 위험조건 검증)의 데모 UI는 docs/archive/2026-08-08-약관위험조건검증/code/ 로 이동했다.
 * 조각투자 가치검증 코어가 붙는 대로 이 파일을 실제 데모 UI로 교체한다.
 */
const NEXT_STEPS = [
  "축산물이력제·축평원 경락가 API 제공 수준 확인",
  "DART 공시검색 C005·C010 → 신고서 원문 파싱",
  "대조 어댑터 — 축산물이력제 / 국토부 실거래가",
  "LLM claim 추출 → 대조 판정(일치·불일치·확인 불가) → 근거 카드",
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-danger">
        주제 전환 중 — 2026.08.08
      </p>
      <h1 className="mt-4 font-serif text-3xl font-bold leading-snug">
        조각투자 공시 대조 검증
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        발행사가 공시한 것과 공공 데이터가 일치하는지 대조합니다. 실물을 보여주는
        게 아니라, 보여준 것이 사실인지 검증합니다. 주제 정의는{" "}
        <code className="font-mono text-xs text-ink">
          docs/planning/주제-정의-조각투자-가치검증.md
        </code>{" "}
        참조.
      </p>

      <section className="mt-8 rounded-lg border border-line bg-card p-5 shadow-sm">
        <p className="font-mono text-[11px] tracking-wide text-ink-soft">
          다음 작업
        </p>
        <ol className="mt-3 space-y-2">
          {NEXT_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed">
              <span className="font-mono text-xs text-danger">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-8 font-mono text-[11px] leading-relaxed text-ink-soft">
        신뢰 스파인(<code>src/lib/spine/</code>)은 주제와 무관한 공통 기반이라
        유지됩니다 — 가드레일 · 출처 강제 RAG · HITL · 레이트리밋 · 레드팀 러너.
        도메인 코퍼스와 레드팀 시나리오는 조각투자 기준으로 교체 예정입니다.
      </p>
    </main>
  );
}
