"use client";

/**
 * 층위 ① 실재 확인 — 개체 격자에서 하나를 고르면 근거 카드가 열린다(disclosure).
 * 일치 개체는 열 근거가 없으므로 선택 시 열린 카드를 닫기만 한다.
 */
import { useRef } from "react";

import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { EvidenceCard } from "./EvidenceCard";
import { Rich } from "./Rich";
import { evidenceCardId } from "./screens";
import s from "./demo.module.css";

export function RealityLayer({
  view,
  level,
  focusNo,
  onFocus,
}: {
  view: DemoView;
  level: ExplainLevel;
  focusNo: number | null;
  onFocus: (no: number | null) => void;
}) {
  const evidenceRef = useRef<HTMLDivElement>(null);
  const focus = view.reality.focuses.find((item) => item.no === focusNo);

  const handleSubjectClick = (no: number, hasFocus: boolean) => {
    if (!hasFocus) {
      onFocus(null);
      return;
    }
    onFocus(no);
    requestAnimationFrame(() => {
      evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>① 실재 확인</span>
        <h4>{view.reality.heading}</h4>
        <span className={s.src}>{view.reality.source}</span>
      </div>
      <div className={s.layerBody}>
        <p className={s.herdCap}>
          <Rich parts={view.reality.caption} />
        </p>
        <div className={s.herd} aria-label="개체별 판정">
          {view.reality.subjects.map((subject) => {
            const isOpen = subject.no === focusNo;
            return (
              <button
                type="button"
                key={subject.no}
                className={[
                  s.cow,
                  subject.verdict !== "match" ? s.cowWarn : "",
                  isOpen ? s.cowSel : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={subject.ariaLabel}
                aria-expanded={subject.hasFocus ? isOpen : undefined}
                // 닫힌 카드는 DOM에 없다 — 실제로 존재할 때만 가리킨다
                aria-controls={isOpen ? evidenceCardId(subject.no) : undefined}
                onClick={() => handleSubjectClick(subject.no, subject.hasFocus)}
              >
                {subject.no}
                <small>{subject.badge}</small>
              </button>
            );
          })}
        </div>

        {focus && <EvidenceCard focus={focus} level={level} ref={evidenceRef} />}
      </div>
    </div>
  );
}
