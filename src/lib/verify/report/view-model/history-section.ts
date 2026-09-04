import { maskFreeText } from "../mask";
import { formatIsoDate } from "../format";
import type { ReportContext } from "./context";
import type { DemoView, NoteItemView } from "./types";

const presentEngineNote = (note: string): string =>
  maskFreeText(note)
    .replaceAll("exact parcel", "동일 건물")
    .replace("tradabilityStatus는 unknown", "거래 가능 여부는 미확인");

const ASSET_LIFECYCLE_LABEL = {
  "acquisition-pending": "취득 대기",
  operating: "운영 중",
  "sale-in-progress": "매각 진행 중",
  sold: "매각 완료",
  settled: "정산 완료",
  unknown: "생애주기 미확인",
} as const;

const TRADABILITY_LABEL = {
  available: "거래 가능",
  suspended: "거래 일시 중단",
  ended: "거래 종료",
  unknown: "거래 가능 여부 미확인",
} as const;

const realEstateStatusItems = (ctx: ReportContext): readonly NoteItemView[] => {
  const metadata = ctx.report.realEstate;
  if (!metadata?.statusEvidence) return [];

  const lifecycle = metadata.statusEvidence.assetLifecycle;
  const tradability = metadata.statusEvidence.tradabilityStatus;
  const lifecycleMeta = lifecycle
    ? lifecycle.sourceKind === "platform-claim"
      ? `플랫폼 제공 주장 · ${lifecycle.asOf} 기준 운영·배당 이력입니다. 현재 상태를 독립 원장으로 확정한 결과가 아닙니다.`
      : `${lifecycle.label} · ${lifecycle.asOf} 기준 상태 근거입니다. 현재 상태를 독립 원장으로 확정한 결과가 아닙니다.`
    : "";
  const tradabilityMeta = tradability
    ? tradability.sourceKind === "platform-claim"
      ? `플랫폼 공개 화면 기준 미확인입니다. ${tradability.asOf} 현재 거래 가능 상태를 독립 원장으로 확정한 결과가 아닙니다.`
      : `${tradability.label} 기준 미확인입니다. 현재 거래 가능 상태를 독립 원장으로 확정한 결과가 아닙니다.`
    : "";
  return [
    ...(lifecycle
      ? [
          {
            id: "real-estate-lifecycle-status",
            tone: "unknown" as const,
            title: `자산 생애주기 · ${ASSET_LIFECYCLE_LABEL[metadata.assetLifecycle]}`,
            meta: lifecycleMeta,
            source: {
              label: lifecycle.label,
              url: lifecycle.url,
              asOf: formatIsoDate(lifecycle.asOf),
            },
          },
        ]
      : []),
    ...(tradability
      ? [
          {
            id: "real-estate-tradability-status",
            tone: "unknown" as const,
            title: `거래 가능 상태 · ${TRADABILITY_LABEL[metadata.tradabilityStatus]}`,
            meta: tradabilityMeta,
            source: {
              label: tradability.label,
              url: tradability.url,
              asOf: formatIsoDate(tradability.asOf),
            },
          },
        ]
      : []),
  ];
};

export const buildHistorySection = (ctx: ReportContext): DemoView["history"] => ({
  heading: "검증 대상 문서와 재검증 이력",
  source: "출처 · 리포트 버전링",
  items: [
    {
      id: "document",
      tone: "good",
      title:
        ctx.assetKind === "real-estate"
          ? ctx.isOperatingRealEstate
            ? `상품 원문(${ctx.submittedOn} 기준) 대조 · 플랫폼 공개자료 기준 운영 상태`
            : `공모 공고·매각 공시(${ctx.submittedOn} 기준) 대조`
          : `증권신고서 ${ctx.submittedOn} 제출본 대조`,
      meta: `대조 실행 ${ctx.generatedAt} · 리포트 버전 ${ctx.versionCount}건 보관`,
    },
    ...realEstateStatusItems(ctx),
    ...ctx.report.notes.map(
      (note, index): NoteItemView => ({
        id: `engine-note-${index}`,
        tone: "unknown",
        title: presentEngineNote(note),
        meta: "엔진 실행 기록",
      }),
    ),
    {
      id: "amendment-watch",
      tone: "warn",
      title: "정정 접수 감시와 재대조는 주 2회 자동 실행되고, 알림 발송 채널은 아직 연결되지 않았습니다",
      meta: "정정 접수 조회 · 재대조는 자동 실행 · 알림 발송은 다음 단계 범위입니다",
    },
  ],
});
