"use client";

/**
 * 데모 화면 v4 — 조각투자 핀테크 프로덕트 룩 (2026-08-10 목업 구조 유지).
 * 레퍼런스: 뮤직카우·프랩·카사 실물 화면 실측 — demo.module.css 헤더 주석 참조.
 * 3화면: 공모 선택 → 검증 리포트(판정·근거 카드·눈높이 토글) → 알림·리플레이.
 *
 * 데이터는 전부 검증 엔진 산출 리포트(data/public/{offerId}/report-*.json)에서
 * 파생된다 — Server Component가 스냅샷을 읽어 뷰 모델(props)로 넘긴다.
 * 이 컴포넌트는 하드코딩 수치를 갖지 않으며, 익명화도 서버에서 이미 끝난 상태다.
 *
 * 이 파일은 껍데기(헤더·탭·푸터)만 맡고 화면 본문은 *Screen 컴포넌트에 있다.
 */
import { Fragment, useRef, useState, type KeyboardEvent } from "react";

import type { DemoView } from "@/lib/verify/report/view-model";

import { AlertScreen } from "./AlertScreen";
import { IconCrosscheck } from "./icons";
import { OfferScreen } from "./OfferScreen";
import { ReportScreen } from "./ReportScreen";
import { panelId, SCREEN_TABS, tabId, type ScreenId } from "./screens";
import s from "./demo.module.css";

/** 화살표 키가 옮겨 갈 탭 인덱스 — 대상이 없으면 -1 */
const nextTabIndex = (key: string, current: number): number => {
  const last = SCREEN_TABS.length - 1;
  if (key === "ArrowRight") return current === last ? 0 : current + 1;
  if (key === "ArrowLeft") return current === 0 ? last : current - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return -1;
};

export function DemoApp({ view }: { view: DemoView }) {
  const [screen, setScreen] = useState<ScreenId>("s1");
  const appRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<ScreenId, HTMLButtonElement | null>());

  const goTo = (id: ScreenId) => {
    setScreen(id);
    appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** tablist 관례 — 좌우 화살표로 이동하고 이동한 탭이 곧바로 선택된다 */
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = SCREEN_TABS[nextTabIndex(event.key, index)];
    if (!target) return;
    event.preventDefault();
    goTo(target.id);
    tabRefs.current.get(target.id)?.focus();
  };

  return (
    <div className={s.root}>
      <h1 className={s.srOnly}>크로스체크 — 조각투자 공시 대조 검증 데모</h1>
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

        <div className={s.flow} role="tablist" aria-label="데모 흐름">
          {SCREEN_TABS.map((tab, index) => {
            const isSelected = screen === tab.id;
            return (
              <Fragment key={tab.id}>
                {index > 0 && (
                  <span className={s.arr} aria-hidden="true">
                    →
                  </span>
                )}
                <button
                  type="button"
                  role="tab"
                  id={tabId(tab.id)}
                  // 선택된 탭의 패널만 렌더링한다 — 없는 id는 가리키지 않는다
                  aria-controls={isSelected ? panelId(tab.id) : undefined}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  ref={(node) => {
                    tabRefs.current.set(tab.id, node);
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  onClick={() => goTo(tab.id)}
                >
                  {tab.label}
                </button>
              </Fragment>
            );
          })}
        </div>

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
