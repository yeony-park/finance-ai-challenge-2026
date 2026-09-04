import type { AmendmentReplayView } from "@/lib/verify/amend/replay-view";
import type { WatchStatusView } from "@/lib/verify/amend/watch-view";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { AmendmentReplay } from "./AmendmentReplay";
import { WATCH_HEADING_ID } from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
import { ReportSectionFrame } from "./ReportSectionFrame";
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

const pendingText = (watch: WatchStatusView | null | undefined): string =>
  watch && watch.amendments.length > 0
    ? "접수가 확인된 정정신고서의 원문이 아직 공개되지 않아 재대조 전입니다 — 원문이 공개되는 대로 같은 절차로 다시 대조한 기록이 이 자리에 남습니다."
    : "정정신고서가 접수되면 같은 절차로 다시 대조한 기록이 이 자리에 남습니다. 정정 접수 여부는 자동으로 조회됩니다.";

interface WatchSectionProps {
  readonly watch?: WatchStatusView | null;
  readonly replay?: AmendmentReplayView | null;
}

export function WatchSection({ watch, replay }: WatchSectionProps) {
  const latestAmendment = watch?.amendments.at(-1);

  return (
    <ReportSectionFrame
      headingId={WATCH_HEADING_ID}
      title="정정 이력"
      lead="정정신고서가 접수되면 같은 절차로 다시 대조하고 변경 기록을 남깁니다."
      muted
      footer={(
        <ReportSectionFooter
          sources={[
            watch
              ? `조회 ${watch.checkedAtLabel} · ${watch.detail}`
              : "정정 접수 조회 출처 미연결",
          ]}
          anchor={METHODOLOGY_ANCHOR.amendment}
          label="정정은 어떻게 다시 대조되나요?"
        />
      )}
    >
      <dl className={s.watchOverview}>
        <div className={s.watchMetric} data-tone="accent">
          <dt>정정신고서</dt>
          <dd>
            {watch?.isDetectionFailed ? "—" : (watch?.amendmentCount ?? 0)}
            {!watch?.isDetectionFailed ? <small>건</small> : null}
          </dd>
          <p>
            {watch?.isDetectionFailed
              ? "조회 결과 확인 불가"
              : latestAmendment
                ? `최근 접수 ${latestAmendment.receivedOnLabel}`
                : "접수 기록 없음"}
          </p>
        </div>
        <div className={s.watchMetric}>
          <dt>자동 재조회</dt>
          <dd>주 2회</dd>
          <p>월·목 기준으로 정정 접수를 다시 확인합니다.</p>
        </div>
      </dl>

      {replay ? (
        <AmendmentReplay replay={replay} />
      ) : (
        <p className={s.watchPending}>{pendingText(watch)}</p>
      )}

      <details className={`${s.supportingDetails} ${s.questionDetails}`}>
        <summary className={s.supportingSummary}>조회·알림 운영 정보 보기</summary>
        <div className={s.supportingTextBody}>
          <p>{watch ? watchStatusText(watch) : UNCONNECTED_WATCH_TEXT}</p>
          <p>{NOTIFY_CHANNEL_TEXT}</p>
        </div>
      </details>
    </ReportSectionFrame>
  );
}
