import {
  buildOfferSchedule,
  OFFERS,
  type OfferEntry,
} from "../../components/site/offers";
import { offerIdForRcpNo } from "./pipeline";

export const POST_CLOSE_NOTE =
  "사후 대조(청약이 종료된 공모)입니다 — 원장 조회는 대조 실행 시각 기준이라, 청약 당시가 아니라 지금의 개체 상태와 비교한 결과입니다.";

export const scheduleNotes = (
  rcpNo: string,
  now: Date,
  offers: readonly OfferEntry[] = OFFERS,
): readonly string[] => {
  const offerId = offerIdForRcpNo(rcpNo);
  if (!offerId) return [];
  const offer = offers.find((entry) => entry.id === offerId);
  if (!offer) return [];
  return buildOfferSchedule(offer, now).phase === "closed"
    ? [POST_CLOSE_NOTE]
    : [];
};
