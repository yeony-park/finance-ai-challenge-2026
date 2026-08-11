"use client";

/**
 * 데모 화면 목업 v4 — 조각투자 핀테크 프로덕트 룩 (2026-08-10).
 * 레퍼런스: 뮤직카우·프랩·카사 실물 화면 실측 — demo.module.css 헤더 주석 참조.
 * 3화면: 공모 선택 → 검증 리포트(3초 판정·근거 카드·눈높이 토글) → 알림·리플레이.
 * 실측 데이터 기반(37두 원장 실호출·경락가 2026-07), 익명화 기본.
 */
import { useEffect, useRef, useState } from "react";

import {
  AUCTION_MAX_PRICE,
  AUCTION_ROWS,
  BAR_SPAN,
  HERD_SIZE,
  REPLAY_STEPS,
  UNVERIFIED_COW,
  type ExplainLevel,
} from "./data";
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

export function DemoApp() {
  const [screen, setScreen] = useState<ScreenId>("s1");
  const appRef = useRef<HTMLDivElement>(null);

  const goTo = (id: ScreenId) => {
    setScreen(id);
    appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={s.root}>
      <p className={s.mockNote}>
        <b>데모 화면 목업 v4</b>
        <span className={s.dot}>·</span>2026-08-10
        <span className={s.dot}>·</span>실측 데이터 기반 — 37두 원장 실호출 · 경락가 2026-07
        <span className={s.dot}>·</span>익명화 기본 적용
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

        {screen === "s1" && <OfferScreen onSelect={() => goTo("s2")} />}
        {screen === "s2" && <ReportScreen />}
        {screen === "s3" && <AlertScreen />}
      </div>

      <p className={s.footer}>
        익명화 데모 — 실제 공모의 실측 데이터를 사용하되 발행사명, 이력번호, 지역을
        마스킹했습니다.
        <br />
        판정 3값(일치 · 원장에서 확인되지 않음 · 확인 불가)과 단정 금지 원칙이 모든
        화면에 적용됩니다.
      </p>
    </div>
  );
}

/* ════════ 화면 1 · 공모 선택 ════════ */

function OfferScreen({ onSelect }: { onSelect: () => void }) {
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
              공모 A · 한우 사육 투자계약증권{" "}
              <span className={`${s.tag} ${s.tagLive}`}>청약 진행 중</span>
            </span>
            <span className={s.offerMeta}>
              공모총액 3.6억 원 · 개체 37두 · 청약 8. 27. – 9. 10.
            </span>
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
              <span className={`${s.tag} ${s.tagPost}`}>매각 완료 · 사후 검증</span>
            </span>
            <span className={s.offerMeta}>
              공모 40억 원 → 매각 45.5억 원 · 인근 실거래가 백분위 대조
            </span>
          </span>
          <span className={s.offerNote}>목업 범위 외</span>
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
          <span className={s.offerNote}>목업 범위 외</span>
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

function ReportScreen() {
  const [level, setLevel] = useState<ExplainLevel>("easy");
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  return (
    <section className={s.screen}>
      <p className={s.eyebrow}>Screen 2 · 검증 리포트</p>

      <div className={s.verdict}>
        <p className={s.verdictEyebrow}>3초 판정 · 국가 원장 실시간 대조</p>
        <div className={s.verdictTitle}>
          <h3>공모 A · 한우 사육 투자계약증권</h3>
          <span className={s.when}>신고서 제출 8. 6. · 대조 실행 8. 10. 09:00</span>
        </div>
        <div className={s.tallies}>
          <div className={`${s.tally} ${s.tGood}`}>
            <div className={s.tallyN}>36</div>
            <div className={s.tallyL}>일치</div>
          </div>
          <div className={`${s.tally} ${s.tWarn}`}>
            <div className={s.tallyN}>1</div>
            <div className={s.tallyL}>원장에서 확인되지 않음</div>
          </div>
          <div className={`${s.tally} ${s.tUnk}`}>
            <div className={s.tallyN}>0</div>
            <div className={s.tallyL}>확인 불가</div>
          </div>
        </div>
        <p className={s.oneLiner}>
          {level === "easy" ? (
            <>
              공시된 주장 37건 중 36건이 공공 데이터와 일치합니다.{" "}
              <b>1건은 국가 이력 원장에서 확인되지 않았습니다.</b> 아래 실재 확인
              카드에서 근거를 볼 수 있습니다.
            </>
          ) : (
            <>
              주장 37건 대조 결과 — 일치 36, 원장 미확인 1, 확인 불가 0. 미확인 1건은
              사육지 이력상 <b>양수 등록 부재, 타 농장 소재</b>입니다. 실재 확인
              카드에서 원문 좌표와 조회 응답을 확인할 수 있습니다.
            </>
          )}
        </p>

        <div className={s.levelRow}>
          <span className={s.levelToggle} role="group" aria-label="설명 수준">
            <button
              aria-pressed={level === "easy"}
              onClick={() => setLevel("easy")}
            >
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
        level={level}
        isEvidenceOpen={isEvidenceOpen}
        onToggleEvidence={setIsEvidenceOpen}
      />
      <PriceLayer />
      <HistoryLayer />

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
  level,
  isEvidenceOpen,
  onToggleEvidence,
}: {
  level: ExplainLevel;
  isEvidenceOpen: boolean;
  onToggleEvidence: (open: boolean) => void;
}) {
  const evidenceRef = useRef<HTMLDivElement>(null);

  const handleCowClick = (cowNo: number) => {
    if (cowNo === UNVERIFIED_COW) {
      onToggleEvidence(true);
      requestAnimationFrame(() => {
        evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } else {
      onToggleEvidence(false);
    }
  };

  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>① 실재 확인</span>
        <h4>공시된 개체 37두의 국가 원장 대조</h4>
        <span className={s.src}>출처 · 축산물이력제</span>
      </div>
      <div className={s.layerBody}>
        <p className={s.herdCap}>
          개체를 선택하면 대조 근거가 표시됩니다. <b>24호</b>에서 확인되지 않은 기록이
          발견되었습니다.
        </p>
        <div className={s.herd} aria-label="개체별 판정">
          {Array.from({ length: HERD_SIZE }, (_, i) => i + 1).map((cowNo) => {
            const isWarn = cowNo === UNVERIFIED_COW;
            return (
              <button
                key={cowNo}
                className={[
                  s.cow,
                  isWarn ? s.cowWarn : "",
                  isWarn && isEvidenceOpen ? s.cowSel : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`개체 ${cowNo}호, ${isWarn ? "원장에서 확인되지 않음" : "일치"}`}
                onClick={() => handleCowClick(cowNo)}
              >
                {cowNo}
                <small>{isWarn ? "미확인" : "일치"}</small>
              </button>
            );
          })}
        </div>

        {isEvidenceOpen && (
          <div className={s.evidence} ref={evidenceRef}>
            <h5>
              <IconAlert className={s.ic} /> 개체 24호 · 원장에서 확인되지 않음
            </h5>
            <div className={s.evCols}>
              <div className={s.evCol}>
                <div className={s.evColH}>신고서 기재 · p.34</div>
                <dl>
                  <dt>이력번호</dt>
                  <dd>21●●●●●79</dd>
                  <dt>취득 시기</dt>
                  <dd>2026. 7. 28.</dd>
                  <dt>보관 장소</dt>
                  <dd>강원 ○○군 사육농가</dd>
                  <dt>취득원가</dt>
                  <dd>4,719,865원</dd>
                </dl>
              </div>
              <div className={s.evCol}>
                <div className={s.evColH}>국가 이력 원장 · 8. 10. 조회</div>
                <dl>
                  <dt>개체 존재</dt>
                  <dd>등록됨 · 한우 · 수</dd>
                  <dt>소유권 이전</dt>
                  <dd className={s.ddAlert}>기록 없음</dd>
                  <dt>현재 사육지</dt>
                  <dd className={s.ddAlert}>경북 ○○시 · 다른 농장</dd>
                  <dt>참고</dt>
                  <dd>나머지 36두는 7. 30. 일괄 이전 등록</dd>
                </dl>
              </div>
            </div>
            <p className={s.evFoot}>
              {level === "easy" ? (
                <>
                  신고서에는 이 개체를 7월 28일에 취득해 강원도 농가에서 사육
                  중이라고 기재되어 있습니다. 그러나 국가 원장에는{" "}
                  <b>소유권 이전 기록이 없고, 현재 사육지도 다른 지역의 농장으로</b>{" "}
                  남아 있습니다. 등록 지연 등의 가능성이 있으므로, 이 기록만으로
                  문제가 있다고 단정할 수 없습니다.
                </>
              ) : (
                <>
                  신고서 p.34는 취득 2026. 7. 28., 보관 강원을 기재하고 있으나, 이력
                  원장의 사육지 기록은 출생 시 전산등록 1건뿐으로{" "}
                  <b>양수 기록이 부재하며 현 사육지가 타 지역 농장</b>입니다. 비교
                  대상 36두는 7. 30. 일괄 양수 등록과 대비됩니다. 원인(등록 지연,
                  미인도, 오기)은 본 데이터만으로 판정할 수 없습니다.
                </>
              )}
            </p>
            <div className={s.srcLine}>
              <span>
                <IconDoc className={s.ic} /> 신고서 원문 p.34 · 표 3행
              </span>
              <span>
                <IconDb className={s.ic} /> 축산물이력제 조회 응답 · 8. 10. 09:00
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceLayer() {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>② 가격 위치</span>
        <h4>공시 가격의 시장 분포 대조</h4>
        <span className={s.src}>출처 · 도매시장 경락가 · 2026. 7. · 19,470두</span>
      </div>
      <div className={s.layerBody}>
        <div className={s.chartCap}>
          <span className={s.chartT}>한우 거세 등급별 경락가</span>
          <span className={s.chartS}>
            원/kg · 전국 · 결함 제외 · 괄호는 해당 등급 거래 두수
          </span>
        </div>
        <div className={s.bars}>
          {AUCTION_ROWS.map((row, i) => {
            const widthPct = (row.price / AUCTION_MAX_PRICE) * 100 * BAR_SPAN;
            return (
              <div className={s.brow} key={row.grade}>
                <div className={s.browG}>{row.grade}</div>
                <div className={s.btrack}>
                  <span className={s.baseline} />
                  <div
                    className={s.bfill}
                    style={{
                      width: `${widthPct.toFixed(1)}%`,
                      background: `color-mix(in oklab, var(--d-bar-hi) ${100 - i * 16}%, var(--d-bar-lo))`,
                    }}
                    title={`${row.grade} 등급 ${row.price.toLocaleString()}원/kg, ${row.heads.toLocaleString()}두`}
                  />
                  <span
                    className={s.bval}
                    style={{ left: `calc(${widthPct.toFixed(1)}% + 8px)` }}
                  >
                    {row.price.toLocaleString()}
                    <small>({row.heads.toLocaleString()}두)</small>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className={s.priceNote}>
          신고서에 기재된 등급별 경매단가는 공공 집계 대비{" "}
          <span className={s.priceOk}>−0.1% ~ −1.3% 편차로 허용 범위(±2%) 이내</span>
          입니다. 신고서의 &ldquo;1++ 출현율 57.1%&rdquo;는 발행사 제공 값으로 공공
          데이터로 검증할 수 없어 <b>확인 불가</b>로 분류됩니다.
        </p>
      </div>
    </div>
  );
}

function HistoryLayer() {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>③ 이행 이력</span>
        <h4>발행사의 과거 공시 이행 기록</h4>
        <span className={s.src}>출처 · 전자공시 전수 · 2023 – 2026</span>
      </div>
      <div className={s.layerBody}>
        <div className={s.hist}>
          <div className={s.histItem}>
            <span className={`${s.histIco} ${s.histW}`}>
              <IconUndo className={s.ic} />
            </span>
            <div className={s.histBody}>
              <b>과거 공모 1건, 청약 미달 후 발행사 자기인수</b>
              <div className={s.histM}>증권발행실적보고서 · 공시 원문으로 연결</div>
            </div>
          </div>
          <div className={s.histItem}>
            <span className={`${s.histIco} ${s.histG}`}>
              <IconCheck className={s.ic} />
            </span>
            <div className={s.histBody}>
              <b>이번 공모 정정신고서 0건</b>
              <div className={s.histM}>
                8. 10. 기준 · 매주 재확인 · 변동 시 관심 등록자에게 알림
              </div>
            </div>
          </div>
          <div className={s.histItem}>
            <span className={`${s.histIco} ${s.histU}`}>
              <IconList className={s.ic} />
            </span>
            <div className={s.histBody}>
              <b>발행 이력 8건, 전량 만기 정산 완료</b>
              <div className={s.histM}>
                발행실적보고서 집계 · 익명화 데모에서는 요약만 표시
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════ 화면 3 · 알림 · 리플레이 ════════ */

const REPLAY_STEP_DELAY_MS = 650;
const REPLAY_PUSH_DELAY_MS = 250;

function AlertScreen() {
  const [litCount, setLitCount] = useState(0);
  const [isPushShown, setIsPushShown] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

    REPLAY_STEPS.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => {
          setLitCount(i + 1);
          if (i === REPLAY_STEPS.length - 1) {
            timersRef.current.push(
              setTimeout(
                () => setIsPushShown(true),
                isReduced ? 0 : REPLAY_PUSH_DELAY_MS,
              ),
            );
          }
        }, stepDelay * (i + 1)),
      );
    });
  };

  return (
    <section className={s.screen}>
      <p className={s.eyebrow}>Screen 3 · 관심 공모 알림</p>
      <h2 className={s.h2}>등록한 공모의 변화를 알려드립니다</h2>
      <p className={s.sub}>
        정정신고서가 접수되거나 판정이 달라지면 알림을 보냅니다. 아래 리플레이는 8월
        10일의 실제 감지 과정을 그대로 재생합니다.
      </p>

      <div className={s.alertCard}>
        <h4>감지 리플레이 · 8. 10. 실제 사례 (익명화)</h4>
        <p>개체 24호의 원장 미확인 기록이 발견되어 알림이 발송되기까지의 과정입니다.</p>
        <button className={s.replayBtn} onClick={handleReplay}>
          <IconPlay className={s.ic} />
          리플레이 재생
        </button>

        <div className={s.timeline}>
          {REPLAY_STEPS.map((step, i) => {
            const isLit = litCount > i;
            const isLast = i === REPLAY_STEPS.length - 1;
            return (
              <div
                key={step.title}
                className={[
                  s.step,
                  isLit ? s.stepLit : "",
                  step.isWarned ? s.stepWarned : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={s.stepRail}>
                  <div className={s.stepDot} />
                  {!isLast && <div className={s.stepLine} />}
                </div>
                <div className={s.stepBody}>
                  <div className={s.stepD}>{step.date}</div>
                  <div
                    className={
                      step.isWarned ? `${s.stepT} ${s.stepTWarn}` : s.stepT
                    }
                  >
                    {step.title}
                  </div>
                  {step.detail && <div className={s.stepX}>{step.detail}</div>}
                  {isLast && (
                    <div
                      className={
                        isPushShown ? `${s.push} ${s.pushShow}` : s.push
                      }
                    >
                      <span className={s.pushIco}>
                        <IconBell className={s.ic} />
                      </span>
                      <span className={s.pushBody}>
                        <b>공모 A 판정 변동</b>
                        개체 1건이 원장에서 확인되지 않습니다. 근거 카드를
                        확인하세요.
                        <span className={s.pushM}>지금 · 관심 공모 알림</span>
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
          심사 기간 중 실제 공시 변동이 없어도 이 리플레이로 알림 기능을 확인할 수
          있습니다. 알림 채널은 MVP 기준 인앱 1종입니다.
        </span>
      </div>
    </section>
  );
}
