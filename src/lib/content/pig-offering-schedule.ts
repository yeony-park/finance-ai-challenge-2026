import roundOne from "../../../data/offers/pig-1.json";
import roundTwo from "../../../data/offers/pig-2.json";
import roundThree from "../../../data/offers/pig-3.json";
import { buildOfferSchedule } from "@/components/site/offer-schedule";
import type { PigDisclosureProduct } from "./pig";

const OFFERINGS = { 1: roundOne.offer, 2: roundTwo.offer, 3: roundThree.offer };

export function pigOfferingPeriod(round: PigDisclosureProduct["round"]) {
  const offering = OFFERINGS[round];
  return `${offering.opensOn}~${offering.closesOn}`;
}

export function pigOfferingSchedule(product: Pick<PigDisclosureProduct, "round">, now: Date) {
  const offering = OFFERINGS[product.round];
  return buildOfferSchedule({
    subscription: {
      opensAt: `${offering.opensOn}T00:00:00+09:00`,
      closesAt: `${offering.closesOn}T23:59:59.999+09:00`,
      precision: "day",
    },
  }, now);
}
