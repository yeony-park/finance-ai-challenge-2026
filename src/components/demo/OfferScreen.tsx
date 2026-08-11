/**
 * 화면 1 · 공모 선택.
 * 검증 축이 붙지 않은 자산군은 감추지 않고 비활성 카드로 남겨, 무엇을 못 하는지 먼저 말한다.
 */
import type { DemoView } from "@/lib/verify/report/view-model";

import { IconArrow, IconBuilding, IconEartag, IconInfo, IconPig } from "./icons";
import { panelId, tabId } from "./screens";
import s from "./demo.module.css";

export function OfferScreen({
  view,
  onSelect,
}: {
  view: DemoView;
  onSelect: () => void;
}) {
  return (
    <section
      className={s.screen}
      role="tabpanel"
      id={panelId("s1")}
      aria-labelledby={tabId("s1")}
    >
      <p className={s.eyebrow}>Screen 1 · 공모 선택</p>
      <h2 className={s.h2}>검증할 공모를 선택하세요</h2>
      <p className={s.sub}>
        청약 중이거나 종료된 조각투자 공모의 증권신고서를 국가 공공 데이터와
        대조합니다. 모든 판정에는 원문 위치와 대조 출처가 함께 제공됩니다.
      </p>

      <div className={s.offerList}>
        <button type="button" className={s.offer} onClick={onSelect}>
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

        <button type="button" className={s.offer} disabled>
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

        <button type="button" className={s.offer} disabled>
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
