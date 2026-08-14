import { Reveal } from "@/components/motion/Reveal";
import type { AmendmentReplayView } from "@/lib/verify/amend/replay-view";
import type { WatchStatusView } from "@/lib/verify/amend/watch-view";
import type { DemoView } from "@/lib/verify/report/view-model";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { AmendmentReplay } from "./AmendmentReplay";
import { IconInfo } from "./icons";
import { WATCH_HEADING_ID } from "./ids";
import { MethodologyLink } from "./MethodologyLink";
import { PipelineReplay } from "./PipelineReplay";
import s from "./report.module.css";

const UNCONNECTED_WATCH_TEXT =
  "이 공모의 정정 접수 여부는 아직 조회되지 않았습니다.";

const NOTIFY_CHANNEL_TEXT =
  "관심 등록은 이 브라우저에만 저장되고, 알림 발송 채널은 아직 연결되지 않았습니다.";

const watchStatusText = (watch: WatchStatusView): string => {
  const filings = watch.amendments
    .map((item) => `${item.receivedOnLabel} ${item.reportName}`)
    .join(" · ");
  const listing = filings.length > 0 ? ` 접수 목록 — ${filings}.` : "";
  return `${watch.headline}${listing} ${watch.detail}.`;
};

interface WatchSectionProps {
  readonly view: DemoView;
  readonly watch?: WatchStatusView | null;
  readonly replay?: AmendmentReplayView | null;
}

export function WatchSection({ view, watch, replay }: WatchSectionProps) {
  return (
    <section
      className={`${s.section} ${s.sectionMuted}`}
      aria-labelledby={WATCH_HEADING_ID}
    >
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>정정 계보 · 재검증</span>
          <h2 id={WATCH_HEADING_ID} className={s.layerTitle}>
            이 공모의 정정 접수와 재대조 기록
          </h2>
          <span className={s.layerSource}>
            정정신고서가 접수되거나 판정이 달라지면 이 공모는 같은 파이프라인으로 다시 대조됩니다
          </span>
          <MethodologyLink
            anchor={METHODOLOGY_ANCHOR.amendment}
            label="정정은 어떻게 다시 대조되나요?"
          />
        </header>

        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>{watch ? watchStatusText(watch) : UNCONNECTED_WATCH_TEXT}</span>
        </div>

        {replay ? (
          <AmendmentReplay replay={replay} />
        ) : (
          <PipelineReplay replay={view.replay} />
        )}

        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>{NOTIFY_CHANNEL_TEXT}</span>
        </div>
      </Reveal>
    </section>
  );
}
