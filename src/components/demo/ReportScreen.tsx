"use client";

/**
 * 화면 2 · 검증 리포트.
 * 눈높이 토글은 설명 깊이만 바꾸고 판정은 바꾸지 않는다 — 두 수준이 같은 수치를 인용한다.
 */
import { useState } from "react";

import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { IconInfo } from "./icons";
import { RealityLayer } from "./RealityLayer";
import { Rich } from "./Rich";
import { HistoryLayer, PriceLayer } from "./SummaryLayers";
import { panelId, tabId } from "./screens";
import s from "./demo.module.css";

const TALLY_TONE_CLASS: Record<"good" | "warn" | "unk", string> = {
  good: s.tGood,
  warn: s.tWarn,
  unk: s.tUnk,
};

export function ReportScreen({ view }: { view: DemoView }) {
  const [level, setLevel] = useState<ExplainLevel>("easy");
  const [focusNo, setFocusNo] = useState<number | null>(null);

  return (
    <section
      className={s.screen}
      role="tabpanel"
      id={panelId("s2")}
      aria-labelledby={tabId("s2")}
    >
      <p className={s.eyebrow}>Screen 2 · 검증 리포트</p>
      <h2 className={s.srOnly}>검증 리포트</h2>

      <div className={s.verdict}>
        <p className={s.verdictEyebrow}>{view.verdict.eyebrow}</p>
        <div className={s.verdictTitle}>
          <h3>{view.verdict.title}</h3>
          <span className={s.when}>{view.verdict.when}</span>
        </div>
        <div className={s.tallies}>
          {view.verdict.tallies.map((tally) => (
            <div
              className={`${s.tally} ${TALLY_TONE_CLASS[tally.tone]}`}
              key={tally.label}
            >
              <div className={s.tallyN}>{tally.value}</div>
              <div className={s.tallyL}>{tally.label}</div>
            </div>
          ))}
        </div>
        <p className={s.when}>{view.verdict.itemLine}</p>
        <p className={s.oneLiner}>
          <Rich parts={view.verdict.oneLiner[level]} />
        </p>

        <div className={s.levelRow}>
          <span className={s.levelToggle} role="group" aria-label="설명 수준">
            <button
              type="button"
              aria-pressed={level === "easy"}
              onClick={() => setLevel("easy")}
            >
              쉬운 설명
            </button>
            <button
              type="button"
              aria-pressed={level === "pro"}
              onClick={() => setLevel("pro")}
            >
              전문가
            </button>
          </span>
          <span className={s.levelHint}>판정은 동일하며, 설명 깊이만 달라집니다</span>
        </div>
      </div>

      <RealityLayer view={view} level={level} focusNo={focusNo} onFocus={setFocusNo} />
      <PriceLayer view={view} />
      <HistoryLayer view={view} />

      <div className={s.honesty}>
        <IconInfo className={s.ic} />
        <span>
          이 리포트는 공시와 공공 데이터의 일치 여부만 표시하며, 투자 권유나 가치
          평가가 아닙니다. &ldquo;확인되지 않음&rdquo;은 등록 지연·오기 등 원인을
          단정하지 않습니다. 모든 판정에는 원문 위치와 조회 시각이 함께 표시됩니다.
        </span>
      </div>
    </section>
  );
}
