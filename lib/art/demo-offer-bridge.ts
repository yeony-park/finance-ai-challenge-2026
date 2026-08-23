import { productRepository, statusLabels } from "@/lib/repositories/art-repositories";
import type { ProductView, Verdict, VerdictLabel } from "@/lib/art/types";

/** The fields needed to render an upcoming DEMO art-offer card. */
export type ArtDemoOfferCardView = {
  id: string;
  href: string;
  title: string;
  artistName: string;
  platformName: string;
  imageUrl: string | null;
  statusLabel: string;
  verdict: Verdict;
  verdictLabel: VerdictLabel;
  headline: string;
  reasons: string[];
  minimumInvestment: number | null;
  totalOfferingAmount: number | null;
  asOfDate: string;
};

const verdictOrder: Record<Verdict, number> = {
  worth_considering: 0,
  conditional: 1,
  caution: 2,
  danger: 3,
};

function isUpcomingDemoProduct(product: ProductView) {
  return product.offering.isDemo && product.offering.status === "upcoming";
}

function compareDemoProducts(left: ProductView, right: ProductView) {
  return verdictOrder[left.analysis.verdict] - verdictOrder[right.analysis.verdict]
    || left.offering.id.localeCompare(right.offering.id);
}

function reasonText(reason: ProductView["analysis"]["keyReasons"][number]) {
  return reason.implication;
}

/**
 * Returns only current DEMO offerings that are scheduled for subscription.
 *
 * `productRepository` is the current-product repository, so historical
 * records cannot enter this adapter. Values are copied without replacing
 * nulls with display defaults; the card layer decides how to format them.
 */
export function getArtDemoOfferCards(): ArtDemoOfferCardView[] {
  return productRepository
    .getList()
    .filter(isUpcomingDemoProduct)
    .sort(compareDemoProducts)
    .map((product) => ({
      id: product.offering.id,
      href: `/products/${encodeURIComponent(product.offering.id)}`,
      title: product.offering.title,
      artistName: product.artist.nameKo,
      platformName: product.platform.name,
      imageUrl: product.artwork.imageUrl,
      statusLabel: statusLabels[product.offering.status],
      verdict: product.analysis.verdict,
      verdictLabel: product.analysis.verdictLabel,
      headline: product.analysis.headline,
      reasons: product.analysis.keyReasons.slice(0, 2).map(reasonText),
      minimumInvestment: product.offering.minimumInvestment,
      totalOfferingAmount: product.offering.totalOfferingAmount,
      asOfDate: product.offering.asOfDate,
    }));
}
