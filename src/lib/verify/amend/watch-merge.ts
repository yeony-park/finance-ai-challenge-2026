import type { LedgerMonitorEvent } from "@/lib/db/ledger/monitor-read";
import { formatKstDateTime } from "@/lib/verify/report/format";

import type { WatchAmendment, WatchState } from "./watch-state";

/**
 * 커밋된 감시 파일(`data/public/watch/`)과 cron이 DB 원장에 남긴 감시 이벤트를 한 상태로 합친다.
 * 규칙: 더 최근 확인이 이긴다. 원장에는 접수번호만 있으므로 서류명·접수일은 파일 기록을 재사용하고,
 * 파일에 없는 접수번호는 접수번호 앞 8자리(접수일)로 채우고 서류명은 확인 전으로 표시한다.
 * 최신 자동 조회가 실패했으면 그 앞의 성공 기록을 보여주고 실패 사실을 notes에 남긴다.
 */

export const UNCONFIRMED_REPORT_NAME = "정정신고서(서류명 확인 전)";

const NO_REVERIFY_NOTE =
  "정정본 재대조가 실행되지 않아 변경 항목·판정 유지/변동을 아직 계산하지 못했습니다.";

const RCP_NO_PATTERN = /^\d{14}$/;

export const receivedOnFromRcpNo = (rcpNo: string): string =>
  RCP_NO_PATTERN.test(rcpNo) ? rcpNo.slice(0, 8) : "";

const unconfirmedNote = (rcpNos: readonly string[]): string =>
  `접수번호 ${rcpNos.join(", ")}의 서류명은 다음 감시 파일 갱신 때 확인합니다.`;

const failedCheckNote = (checkedAt: string): string =>
  `${formatKstDateTime(checkedAt)} 자동 조회는 실패해 그 전 조회 결과를 표시합니다.`;

const isNewerThan = (left: string, right: string | undefined): boolean =>
  right === undefined || Date.parse(left) > Date.parse(right);

const knownAmendments = (
  file: WatchState | undefined,
): ReadonlyMap<string, WatchAmendment> =>
  new Map((file?.amendments ?? []).map((item) => [item.rcpNo, item]));

const buildAmendments = (
  rcpNos: readonly string[],
  known: ReadonlyMap<string, WatchAmendment>,
): { readonly amendments: WatchAmendment[]; readonly unconfirmed: readonly string[] } => {
  const unconfirmed: string[] = [];
  const amendments = rcpNos.map((rcpNo): WatchAmendment => {
    const existing = known.get(rcpNo);
    if (existing) return existing;
    unconfirmed.push(rcpNo);
    return {
      rcpNo,
      receivedOn: receivedOnFromRcpNo(rcpNo),
      reportName: UNCONFIRMED_REPORT_NAME,
    };
  });
  return { amendments, unconfirmed };
};

const fromLedgerEvent = (
  offerId: string,
  event: LedgerMonitorEvent,
  file: WatchState | undefined,
): WatchState => {
  if (event.kind === "detection_failed") {
    return {
      offerId,
      checkedAt: event.checkedAt,
      baseRcpNo: event.baseRcpNo ?? file?.baseRcpNo ?? "",
      ...(event.checkedThrough === null ? {} : { checkedThrough: event.checkedThrough }),
      amendmentCount: 0,
      amendments: [],
      sourceName: event.source,
      detectionFailed: true,
      notes: [],
    };
  }

  const { amendments, unconfirmed } = buildAmendments(
    event.amendmentRcpNos,
    knownAmendments(file),
  );
  const notes = [
    ...(amendments.length > 0 ? [NO_REVERIFY_NOTE] : []),
    ...(unconfirmed.length > 0 ? [unconfirmedNote(unconfirmed)] : []),
  ];

  return {
    offerId,
    checkedAt: event.checkedAt,
    baseRcpNo: event.baseRcpNo ?? "",
    ...(event.checkedThrough === null ? {} : { checkedThrough: event.checkedThrough }),
    amendmentCount: amendments.length,
    amendments,
    sourceName: event.source,
    detectionFailed: false,
    notes,
  };
};

export interface MergeWatchStateInput {
  readonly offerId: string;
  readonly file: WatchState | undefined;
  /** 확인 시각 내림차순. 공개 승인 접수번호 필터는 호출자가 적용한다. */
  readonly ledger: readonly LedgerMonitorEvent[];
}

export const mergeWatchState = ({
  offerId,
  file,
  ledger,
}: MergeWatchStateInput): WatchState | undefined => {
  const latest = ledger[0];
  if (!latest || !isNewerThan(latest.checkedAt, file?.checkedAt)) return file;

  if (latest.kind !== "detection_failed") {
    return fromLedgerEvent(offerId, latest, file);
  }

  const lastSuccess = ledger.find(
    (event) =>
      event.kind !== "detection_failed" &&
      isNewerThan(event.checkedAt, file?.checkedAt),
  );
  const fallback = lastSuccess
    ? fromLedgerEvent(offerId, lastSuccess, file)
    : file;
  if (!fallback) return fromLedgerEvent(offerId, latest, file);

  return {
    ...fallback,
    notes: [...fallback.notes, failedCheckNote(latest.checkedAt)],
  };
};
