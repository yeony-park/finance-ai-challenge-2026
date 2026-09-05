import { notFound, permanentRedirect } from "next/navigation";
import { productHref } from "@/components/site/offer-schedule";

export default async function LegacyOfferPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const href = productHref(id);
  if (!href) notFound();
  permanentRedirect(href);
}
