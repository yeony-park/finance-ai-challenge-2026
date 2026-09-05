import type { Metadata } from "next";

import { CARD_DESIGN_META } from "@/lib/content/card-designs";

import { CardDesignLab } from "./CardDesignLab";

export const metadata: Metadata = {
  title: CARD_DESIGN_META.title,
  description: CARD_DESIGN_META.description,
};

export default function CardDesignsPage() {
  return <CardDesignLab />;
}
