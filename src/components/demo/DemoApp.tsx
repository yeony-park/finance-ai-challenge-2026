"use client";

/**
 * 데모 화면 v4 — 조각투자 핀테크 프로덕트 룩 (2026-08-10 목업 구조 유지).
 * 레퍼런스: 뮤직카우·프랩·카사 실물 화면 실측 — demo.module.css 헤더 주석 참조.
 * 3화면: 공모 선택 → 검증 리포트(판정·근거 카드·눈높이 토글) → 알림·리플레이.
 *
 * 데이터는 전부 검증 엔진 산출 리포트(data/reports/{offerId}/report-*.json)에서
 * 파생된다 — Server Component가 스냅샷을 읽어 뷰 모델(props)로 넘긴다.
 * 이 컴포넌트는 하드코딩 수치를 갖지 않으며, 익명화도 서버에서 이미 끝난 상태다.
 */
import { Fragment, useEffect, useRef, useState, type Ref } from "react";

import type {
  DemoView,
  ExplainLevel,
  FocusView,
  NoteItemView,
  RichText,
} from "@/lib/verify/report/view-model";
import {
  IconAlert,
  IconArrow,
  IconBell,
  IconBuilding,
  IconCheck,
  IconCrosscheck,
  IconDb,
  IconDoc,
  IconEartag,
  IconInfo,
  IconList,
  IconPig,
  IconPlay,
  IconUndo,
} from "./icons";
import s from "./demo.module.css";

type ScreenId = "s1" | "s2" | "s3";

const SCREEN_TABS: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: "s1", label: "① 공모 선택" },
  { id: "s2", label: "② 검증 리포트" },
  { id: "s3", label: "③ 알림 · 리플레이" },
];

function Rich({ parts }: { parts: RichText }) {
  return (
    <>
      {parts.map((part, i) =>
        part.isStrong ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
      )}
    </>
  );
}

const NOTE_TONE_CLASS: Record<NoteItemView["tone"], string> = {
  good: s.histG,
  warn: s.histW,
  unknown: s.histU,
};

function NoteList({ items }: { items: readonly NoteItemView[] }) {
  return (
    <div className={s.hist}>
      {items.map((item) => (
        <div className={s.histItem} key={item.title}>
          <span className={`${s.histIco} ${NOTE_TONE_CLASS[item.tone]}`}>
            {item.tone === "good" ? (
              <IconCheck className={s.ic} />
            ) : item.tone === "warn" ? (
              <IconUndo className={s.ic} />
            ) : (
              <IconList className={s.ic} />
            )}
          </span>
          <div className={s.histBody}>
            <b>{item.title}</b>
            <div className={s.histM}>{item.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DemoApp({ view }: { view: DemoView }) {
  const [screen, setScreen] = useState<ScreenId>("s1");
  const appRef = useRef<HTMLDivElement>(null);

  const goTo = (id: ScreenId) => {
    setScreen(id);
    appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={s.root}>
      <p className={s.mockNote}>
        <b>{view.meta.badge}</b>
        {view.meta.items.map((item) => (
          <span key={item}>
            <span className={s.dot}>·</span>
            {item}
          </span>
        ))}
      </p>

      <div className={s.app} ref={appRef}>
        <div className={s.appHead}>
          <span className={s.brand}>
            <span className={s.brandMark}>
              <IconCrosscheck className={s.ic} />
            </span>
            크로스체크 <span className={s.wip}>가칭</span>
            <span className={s.tagline}>공시가 사실인지, 공공 데이터로 확인합니다</span>
          </span>
          <span className={s.demoChip}>익명화 데모</span>
        </div>

        <nav className={s.flow} role="tablist" aria-label="데모 흐름">
          {SCREEN_TABS.map((tab, i) => (
            <span key={tab.id} style={{ display: "contents" }}>
              {i > 0 && <span className={s.arr}>→</span>}
              <button
                role="tab"
                aria-selected={screen === tab.id}
                onClick={() => goTo(tab.id)}
              >
                {tab.label}
              </button>
            </span>
          ))}
        </nav>

        {screen === "s1" && <OfferScreen view={view} onSelect={() => goTo("s2")} />}
        {screen === "s2" && <ReportScreen view={view} />}
        {screen === "s3" && <AlertScreen view={view} />}
      </div>

      <p className={s.footer}>
        익명화 데모 — 실제 공모의 엔진 산출 판정을 사용하되 발행사명, 이력번호, 지역을
        마스킹했습니다.
        <br />
        판정 3값(일치 · 원장에서 확인되지 않음 · 확인 불가)과 단정 금지 원칙이 모든
        화면에 적용됩니다.
      </p>
    </div>
  );
}

/* ════════ 화면 1 · 공모 선택 ════════ */

function OfferScreen({ view, onSelect }: { view: DemoView; onSelect: () => void }) {
  return (
    <section className={s.screen}>
      <p className={s.eyebrow}>Screen 1 · 공모 선택</p>
      <h2 className={s.h2}>검증할 공모를 선택하세요</h2>
      <p className={s.sub}>
        청약 중이거나 종료된 조각투자 공모의 증권신고서를 국가 공공 데이터와
        대조합니다. 모든 판정에는 원문 위치와 대조 출처가 함께 제공됩니다.
      </p>

      <div className={s.offerList}>
        <button className={s.offer} onClick={onSelect}>
          <span className={s.offerIco}>
            <IconEartag className={s.ic} />
          </span>
          <span className={s.offerBody}>
            <span className={s.offerName}>
              {view.offer.title}{" "}
              <span className={`${s.tag} ${s.tagLive}`}>{view.offer.tag}</span>
            </span>
            <span className={s.offerMeta}>{view.offer.meta}</span>
          </span>
          <span className={s.offerCta}>
            검증 리포트 <IconArrow className={s.ic} />
          </span>
        </button>

        <button className={s.offer} disabled>
          <span className={s.offerIco}>
            <IconBuilding className={s.ic} />
          </span>
          <span className={s.offerBody}>
            <span className={s.offerName}>
              공모 B · 상업용 부동산 수익증권{" "}
              <span className={`${s.tag} ${s.tagPost}`}>사후 검증 축</span>
            </span>
            <span className={s.offerMeta}>
              실거래가 대조 어댑터가 아직 연결되지 않아 판정을 제공하지 않습니다
            </span>
          </span>
          <span className={s.offerNote}>데이터 미연결</span>
        </button>

        <button className={s.offer} disabled>
          <span className={s.offerIco}>
            <IconPig className={s.ic} />
          </span>
          <span className={s.offerBody}>
            <span className={s.offerName}>
              공모 C · 양돈 투자계약증권{" "}
              <span className={`${s.tag} ${s.tagNa}`}>실재성 검증 미제공</span>
            </span>
            <span className={s.offerMeta}>
              개체 식별 데이터가 국가 원장에 존재하지 않는 자산군 — 공시 이행 검증만
              제공
            </span>
          </span>
          <span className={s.offerNote}>구조적 검증 불가</span>
        </button>
      </div>

      <div className={s.honesty}>
        <IconInfo className={s.ic} />
        <span>
          검증할 수 없는 것은 검증할 수 없다고 표시합니다. 개체 식별이 구조적으로
          불가능한 자산군에는 실재성 판정을 제공하지 않습니다.
        </span>
      </div>
    </section>
  );
}

/* ════════ 화면 2 · 검증 리포트 ════════ */

const TALLY_TONE_CLASS: Record<"good" | "warn" | "unk", string> = {
  good: s.tGood,
  warn: s.tWarn,
  unk: s.tUnk,
};

function ReportScreen({ view }: { view: DemoView }) {
  const [level, setLevel] = useState<ExplainLevel>("easy");
  const [focusNo, setFocusNo] = useState<number | null>(null);

  return (
    <section className={s.screen}>
      <p className={s.eyebrow}>Screen 2 · 검증 리포트</p>

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
            <button aria-pressed={level === "easy"} onClick={() => setLevel("easy")}>
              쉬운 설명
            </button>
            <button aria-pressed={level === "pro"} onClick={() => setLevel("pro")}>
              전문가
            </button>
          </span>
          <span className={s.levelHint}>판정은 동일하며, 설명 깊이만 달라집니다</span>
        </div>
      </div>

      <RealityLayer
        view={view}
        level={level}
        focusNo={focusNo}
        onFocus={setFocusNo}
      />
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

function RealityLayer({
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
          {view.reality.subjects.map((subject) => (
            <button
              key={subject.no}
              className={[
                s.cow,
                subject.verdict !== "match" ? s.cowWarn : "",
                subject.no === focusNo ? s.cowSel : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={subject.ariaLabel}
              onClick={() => handleSubjectClick(subject.no, subject.hasFocus)}
            >
              {subject.no}
              <small>{subject.badge}</small>
            </button>
          ))}
        </div>

        {focus && <EvidenceCard focus={focus} level={level} ref={evidenceRef} />}
      </div>
    </div>
  );
}

function EvidenceCard({
  focus,
  level,
  ref,
}: {
  focus: FocusView;
  level: ExplainLevel;
  ref: Ref<HTMLDivElement>;
}) {
  return (
    <div className={s.evidence} ref={ref}>
      <h5>
        <IconAlert className={s.ic} /> {focus.title}
      </h5>
      <div className={s.evCols}>
        <div className={s.evCol}>
          <div className={s.evColH}>{focus.claimHeading}</div>
          <dl>
            {focus.claimRows.map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.isAlert ? s.ddAlert : undefined}>
                  {row.value}
                  {row.note && <small className={s.rowNote}>{row.note}</small>}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
        <div className={s.evCol}>
          <div className={s.evColH}>{focus.ledgerHeading}</div>
          <dl>
            {focus.ledgerRows.map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <span className={row.isAlert ? s.ddAlert : undefined}>
                    {row.value}
                  </span>
                  {row.note && <small className={s.rowNote}>{row.note}</small>}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
      <p className={s.evFoot}>
        <Rich parts={focus.foot[level]} />
      </p>
      <div className={s.srcLine}>
        <span>
          <IconDoc className={s.ic} /> {focus.sourceDoc}
        </span>
        <span>
          <IconDb className={s.ic} /> {focus.sourceLedger}
        </span>
      </div>
    </div>
  );
}

function PriceLayer({ view }: { view: DemoView }) {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>② 가격 위치</span>
        <h4>{view.price.heading}</h4>
        <span className={s.src}>{view.price.source}</span>
      </div>
      <div className={s.layerBody}>
        <NoteList items={view.price.items} />
        <p className={s.priceNote}>{view.price.note}</p>
      </div>
    </div>
  );
}

function HistoryLayer({ view }: { view: DemoView }) {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>③ 이행 이력</span>
        <h4>{view.history.heading}</h4>
        <span className={s.src}>{view.history.source}</span>
      </div>
      <div className={s.layerBody}>
        <NoteList items={view.history.items} />
      </div>
    </div>
  );
}

/* ════════ 화면 3 · 알림 · 리플레이 ════════ */

const REPLAY_STEP_DELAY_MS = 650;
const REPLAY_PUSH_DELAY_MS = 250;

function AlertScreen({ view }: { view: DemoView }) {
  const [litCount, setLitCount] = useState(0);
  const [isPushShown, setIsPushShown] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const steps = view.replay.steps;

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleReplay = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setLitCount(0);
    setIsPushShown(false);

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepDelay = isReduced ? 0 : REPLAY_STEP_DELAY_MS;

    steps.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(
          () => {
            setLitCount(i + 1);
            if (i === steps.length - 1) {
              timersRef.current.push(
                setTimeout(
                  () => setIsPushShown(true),
                  isReduced ? 0 : REPLAY_PUSH_DELAY_MS,
                ),
              );
            }
          },
          stepDelay * (i + 1),
        ),
      );
    });
  };

  return (
    <section className={s.screen}>
      <p className={s.eyebrow}>Screen 3 · 관심 공모 알림</p>
      <h2 className={s.h2}>등록한 공모의 변화를 알려드립니다</h2>
      <p className={s.sub}>
        정정신고서가 접수되거나 판정이 달라지면 알림을 보냅니다. 아래 리플레이는 이
        공모의 실제 대조 실행을 순서대로 재생합니다.
      </p>

      <div className={s.alertCard}>
        <h4>{view.replay.heading}</h4>
        <p>{view.replay.lead}</p>
        <button className={s.replayBtn} onClick={handleReplay}>
          <IconPlay className={s.ic} />
          리플레이 재생
        </button>

        <div className={s.timeline}>
          {steps.map((step, i) => {
            const isLit = litCount > i;
            const isLast = i === steps.length - 1;
            return (
              <div
                key={step.title}
                className={[s.step, isLit ? s.stepLit : "", step.isWarned ? s.stepWarned : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={s.stepRail}>
                  <div className={s.stepDot} />
                  {!isLast && <div className={s.stepLine} />}
                </div>
                <div className={s.stepBody}>
                  <div className={s.stepD}>{step.date}</div>
                  <div className={step.isWarned ? `${s.stepT} ${s.stepTWarn}` : s.stepT}>
                    {step.title}
                  </div>
                  {step.detail && <div className={s.stepX}>{step.detail}</div>}
                  {isLast && (
                    <div className={isPushShown ? `${s.push} ${s.pushShow}` : s.push}>
                      <span className={s.pushIco}>
                        <IconBell className={s.ic} />
                      </span>
                      <span className={s.pushBody}>
                        <b>{view.replay.push.title}</b>
                        {view.replay.push.body}
                        <span className={s.pushM}>{view.replay.push.meta}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.honesty}>
        <IconInfo className={s.ic} />
        <span>
          알림 발송·정정 감시는 아직 연결되지 않았습니다 — 위 리플레이는 실제 대조
          실행 결과를 재생한 뒤, 알림 화면이 어떻게 보일지 미리 보여 줍니다.
        </span>
      </div>
    </section>
  );
}
