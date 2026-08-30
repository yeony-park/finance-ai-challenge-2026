import { formatKstDateTime, formatWon, formatYmd8 } from "../report/format";
import type { FlaggedSeries, TrackRecord } from "./schema";

export interface TrackRecordFactView {
  readonly id: string;
  readonly text: string;
  readonly source: string;
}

export interface TrackRecordMetricView {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly tone: "base" | "accent";
}

export interface TrackRecordCardView {
  readonly title: string;
  readonly lead: string;
  readonly metrics: readonly TrackRecordMetricView[];
  readonly facts: readonly TrackRecordFactView[];
  readonly notice: string;
  readonly meta: string;
}

export const TRACK_RECORD_NOTICE =
  "이 카드는 평가나 등급이 아니라 공시 기록을 그대로 센 집계입니다. 집계 단위는 공시상 법적 발행사이며, 서비스 브랜드와 청약 플랫폼은 별도 항목으로 두고 합산하지 않습니다.";

const formatUnits = (units: number): string => `${units.toLocaleString("en-US")}주`;

const sourceLabel = (series: FlaggedSeries): string =>
  `출처 · 접수번호 ${series.source.rcpNo} ${series.source.reportName} (${formatYmd8(series.source.receivedOn)})`;

const searchSource = (record: TrackRecord): string =>
  `출처 · ${record.sourceName} (${formatYmd8(record.window.fromYmd)} ~ ${formatYmd8(record.window.throughYmd)} 조회)`;

const rateSuffix = (series: FlaggedSeries): string =>
  series.generalSubscriptionRatePercent === null
    ? ""
    : ` (신고서 기재 청약률 ${series.generalSubscriptionRatePercent}%)`;

const underSubscribedText = (series: FlaggedSeries): string =>
  `제${series.seriesLabel}회차는 일반투자자 청약수량 ${formatUnits(series.generalSubscribedUnits)}가 최초 배정수량 ${formatUnits(series.generalInitialUnits)}에 미달했습니다${rateSuffix(series)}.`;

const operatorText = (series: FlaggedSeries): string => {
  const added = series.operatorFinalUnits - series.operatorInitialUnits;
  const amount =
    series.operatorFinalAmountKrw === null
      ? ""
      : ` · 최종 배정금액 ${formatWon(series.operatorFinalAmountKrw)}`;
  return `제${series.seriesLabel}회차에서 공동사업 운영자의 최종 배정수량은 최초 배정 ${formatUnits(series.operatorInitialUnits)}보다 ${formatUnits(added)} 많은 ${formatUnits(series.operatorFinalUnits)}입니다${amount}.`;
};

const seriesFacts = (record: TrackRecord): readonly TrackRecordFactView[] =>
  record.flaggedSeries.flatMap((series): readonly TrackRecordFactView[] => [
    ...(series.isUnderSubscribed
      ? [
          {
            id: `under-${series.seriesLabel}`,
            text: underSubscribedText(series),
            source: sourceLabel(series),
          },
        ]
      : []),
    ...(series.operatorTookUnallocated
      ? [
          {
            id: `operator-${series.seriesLabel}`,
            text: operatorText(series),
            source: sourceLabel(series),
          },
        ]
      : []),
  ]);

export const toTrackRecordView = (record: TrackRecord): TrackRecordCardView => {
  const { counts } = record;
  const search = searchSource(record);

  const facts: TrackRecordFactView[] = [
    {
      id: "offerings",
      text: `이 공모의 발행사가 ${formatYmd8(record.window.fromYmd)} 이후 제출한 투자계약증권 증권신고서는 ${counts.offeringFilings}건이고, 같은 기간 정정신고서는 ${counts.offeringAmendments}건 접수됐습니다.`,
      source: search,
    },
    {
      id: "series",
      text: `증권발행실적보고서 ${counts.resultReports}건(정정 ${counts.resultAmendments}건 반영)에서 청약 결과를 읽을 수 있는 회차는 ${counts.seriesChecked}건입니다.`,
      source: search,
    },
  ];

  if (counts.withdrawalFilings > 0) {
    facts.push({
      id: "withdrawals",
      text: `같은 기간 철회신고서는 ${counts.withdrawalFilings}건 접수됐습니다.`,
      source: search,
    });
  }

  const flagged = seriesFacts(record);
  if (flagged.length === 0) {
    facts.push({
      id: "no-flagged",
      text: `청약수량이 최초 배정수량에 미달한 회차와 공동사업 운영자가 최초 배정보다 더 배정받은 회차는 ${counts.seriesChecked}건 중 0건입니다.`,
      source: search,
    });
  } else {
    facts.push({
      id: "flagged-summary",
      text: `회차 ${counts.seriesChecked}건 가운데 청약수량이 최초 배정수량에 미달한 회차는 ${counts.underSubscribedSeries}건, 공동사업 운영자가 최초 배정보다 더 배정받은 회차는 ${counts.operatorTookUnallocatedSeries}건입니다.`,
      source: search,
    });
    facts.push(...flagged);
  }

  return {
    title: "발행사 트랙레코드",
    lead: "발행사가 공시로 남긴 기록을 회차 단위로 센 결과입니다. 판정이나 등급은 붙이지 않습니다.",
    metrics: [
      {
        id: "offering-filings",
        label: "증권신고서",
        value: counts.offeringFilings,
        tone: "base",
      },
      {
        id: "offering-amendments",
        label: "정정신고서",
        value: counts.offeringAmendments,
        tone: "base",
      },
      {
        id: "series-checked",
        label: "확인 회차",
        value: counts.seriesChecked,
        tone: "base",
      },
      {
        id: "withdrawals",
        label: "철회신고서",
        value: counts.withdrawalFilings,
        tone: "base",
      },
      {
        id: "under-subscribed",
        label: "청약 미달 회차",
        value: counts.underSubscribedSeries,
        tone: "accent",
      },
      {
        id: "operator-unallocated",
        label: "운영자 추가 배정",
        value: counts.operatorTookUnallocatedSeries,
        tone: "accent",
      },
    ],
    facts,
    notice: TRACK_RECORD_NOTICE,
    meta: `집계 시각 ${formatKstDateTime(record.collectedAt)} · ${record.sourceName}`,
  };
};

export const describeTrackRecord = (record: TrackRecord): readonly string[] =>
  toTrackRecordView(record).facts.map((fact) => `${fact.text} [${fact.source}]`);
