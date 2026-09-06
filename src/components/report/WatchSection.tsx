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
    ? "접수된 정정신고서의 변경 항목은 아직 재대조하지 않았습니다."
    : "정정신고서가 접수되면 같은 절차로 다시 대조한 기록이 이 자리에 남습니다. 정정 접수 여부는 자동으로 조회됩니다.";

interface WatchSectionProps {
  readonly watch?: WatchStatusView | null;
  readonly replay?: AmendmentReplayView | null;
  readonly showNotificationNotice?: boolean;
}

export function WatchSection({
  watch,
  replay,
  showNotificationNotice = true,
}: WatchSectionProps) {
  const latestAmendment = watch?.amendments.at(-1);
  const hasWatchResult = watch != null && !watch.isDetectionFailed;

  return (
    <ReportSectionFrame
      headingId={WATCH_HEADING_ID}
      title="정정 이력"
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
            {hasWatchResult ? watch.amendmentCount : "—"}
            {hasWatchResult ? <small>건</small> : null}
          </dd>
          <p>
            {!watch
              ? "조회 자료 미연결"
              : watch.isDetectionFailed
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
          {showNotificationNotice ? <p>{NOTIFY_CHANNEL_TEXT}</p> : null}
        </div>
      </details>
    </ReportSectionFrame>
  );
}
