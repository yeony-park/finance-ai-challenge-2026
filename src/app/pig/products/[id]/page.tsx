import { AiSummary } from "@/components/ai-summary/AiSummary";
import { PigFilingArtifactDetail } from "@/components/pig/PigFilingArtifactDetail";
import { PigFilingEvidenceQuery } from "@/components/ai-assistant/EvidenceQuery";
import { loadAiSummary } from "@/lib/ai-summary/cache";
import { loadApprovedPigFilingArtifact } from "@/lib/knowledge/pig-filing-artifact";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PigAmendmentHistory } from "@/components/pig/PigAmendmentHistory";
import { PigDisclosureDetail } from "@/components/pig/PigDisclosureDetail";
import { PigDiseaseContext } from "@/components/pig/PigDiseaseContext";
import { PigReviewSections } from "@/components/pig/PigReviewSections";
import { FilingFactsSection } from "@/components/report/FilingFactsSection";
import {
  ReportDocument,
  type ReportProductHeader,
} from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import type { ReportSection } from "@/components/report/report-sections";
import {
  DISEASE_HEADING_ID,
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
  REALITY_HEADING_ID,
  VERDICT_HEADING_ID,
  WATCH_HEADING_ID,
} from "@/components/report/ids";
import {
  PIG_DISCLOSURE_PRODUCTS,
  type PigDisclosureProduct,
} from "@/lib/content/pig";
import {
  PIG_EXTRA_DISTRIBUTION_FILING,
  PIG_REPORT_COPY,
} from "@/lib/content/pig-review";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";

import s from "@/components/report/report.module.css";

interface PigReportPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const PIG_REPORT_SECTIONS: readonly ReportSection[] = [
  {
    key: "verdict",
    id: VERDICT_HEADING_ID,
    label: PIG_REPORT_COPY.sections.summary,
  },
  {
    key: "filing",
    id: "report-filing-heading",
    label: PIG_REPORT_COPY.sections.filing,
  },
  {
    key: "watch",
    id: WATCH_HEADING_ID,
    label: PIG_REPORT_COPY.sections.amendment,
  },
  {
    key: "history",
    id: HISTORY_HEADING_ID,
    label: PIG_REPORT_COPY.sections.history,
  },
  {
    key: "reality",
    id: REALITY_HEADING_ID,
    label: PIG_REPORT_COPY.sections.reality,
  },
  {
    key: "disease",
    id: DISEASE_HEADING_ID,
    label: PIG_REPORT_COPY.sections.disease,
  },
  { key: "price", id: PRICE_HEADING_ID, label: PIG_REPORT_COPY.sections.price },
];

const productForId = (id: string): PigDisclosureProduct | null =>
  PIG_DISCLOSURE_PRODUCTS.find((product) => product.id === id) ?? null;

const formatLargeWon = (value: number): string =>
  `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;

const dartAsOf = (): string =>
  PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
    product.documents.map((document) => document.filedAt),
  )
    .concat(PIG_EXTRA_DISTRIBUTION_FILING.filedAt)
    .sort()
    .at(-1) ?? "";

const productHeaderFor = (
  product: PigDisclosureProduct,
): ReportProductHeader => ({
  imageSrc: "/category-pig.jpg",
  imageAlt: PIG_REPORT_COPY.imageAlt,
  status: `${PIG_REPORT_COPY.reportStatus} · ${product.statusLabel}`,
  title: product.productName,
  meta: `${PIG_REPORT_COPY.headerMetaPrefix} · ${product.farm.name} · ${product.farm.region}`,
  facts: [
    {
      label: PIG_REPORT_COPY.facts.subscription,
      value: product.offering.subscriptionPeriod,
    },
    {
      label: PIG_REPORT_COPY.facts.offering,
      value: formatLargeWon(product.offering.issueAmountWon),
    },
    {
      label: PIG_REPORT_COPY.facts.units,
      value: `${product.offering.units.toLocaleString("ko-KR")}좌 · ${product.offering.unitPriceWon.toLocaleString("ko-KR")}원`,
    },
    {
      label: PIG_REPORT_COPY.facts.farm,
      value: `${product.farm.name} · ${product.farm.region}`,
    },
  ],
});

function PigReportPanel({
  id,
  children,
}: {
  readonly id: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={`${s.section} ${s.reportContentSection}`} id={id}>
      <div className={s.wrap}>{children}</div>
    </section>
  );
}

export function generateStaticParams() {
  return [...PIG_DISCLOSURE_PRODUCTS]
    .sort((left, right) => left.round - right.round)
    .map((product) => ({ id: product.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PigReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = productForId(id);
  if (!product)
    return { title: "리포트를 찾을 수 없습니다", robots: { index: false } };
  return {
    title: `${product.productName} 검증 리포트`,
    description: `${product.productName}의 공시, 정정, 이행, 실재 확인, 질병 및 가격 정보를 구분해 보여줍니다.`,
  };
}

export default async function PigReportPage({ params }: PigReportPageProps) {
  const { id } = await params;
  const product = productForId(id);
  if (!product) notFound();

  const productId = `pig-${product.round}`;
  const [filingFacts, artifact, aiSummary] = await Promise.all([
    loadFilingFacts(productId),
    loadApprovedPigFilingArtifact("pig", productId),
    loadAiSummary("pig", productId),
  ]);
  const commonDetailProps = {
    allProducts: PIG_DISCLOSURE_PRODUCTS,
    dartAsOf: dartAsOf(),
    product,
  } as const;

  return (
    <div className={s.reportPage}>
      <div className={s.breadcrumbBar}>
        <nav className={`${s.wrap} ${s.breadcrumb}`} aria-label="현재 위치">
          <Link href="/pig?tab=analysis" className={s.breadcrumbBack}>
            <span aria-hidden="true">←</span>
            {PIG_REPORT_COPY.breadcrumbBack}
          </Link>
          <span className={s.breadcrumbDivider} aria-hidden="true">
            /
          </span>
          <span className={s.breadcrumbCurrent} aria-current="page">
            {product.productName}
          </span>
        </nav>
      </div>

      <ReportDocument
        productHeader={productHeaderFor(product)}
        aiSummary={<AiSummary summary={aiSummary} />}
        copilot={artifact ? <PigFilingEvidenceQuery productId={productId} /> : null}
        sections={PIG_REPORT_SECTIONS}
        sectionContent={{
          verdict: (
            <PigReportPanel id={VERDICT_HEADING_ID}>
              <PigReviewSections product={product} summaryOnly />
            </PigReportPanel>
          ),
          filing: (
            <>
              {filingFacts ? (
                <FilingFactsSection facts={filingFacts} />
              ) : (
                <PigReportPanel id="report-filing-heading">
                  <PigDisclosureDetail
                    {...commonDetailProps}
                    section="filing"
                  />
                </PigReportPanel>
              )}
              {artifact ? (
                <div className={s.wrap}>
                  <PigFilingArtifactDetail artifact={artifact} />
                </div>
              ) : null}
            </>
          ),
          watch: (
            <PigReportPanel id={WATCH_HEADING_ID}>
              <PigAmendmentHistory product={product} />
            </PigReportPanel>
          ),
          history: (
            <PigReportPanel id={HISTORY_HEADING_ID}>
              <PigDisclosureDetail {...commonDetailProps} section="history" />
            </PigReportPanel>
          ),
          reality: (
            <PigReportPanel id={REALITY_HEADING_ID}>
              <PigDisclosureDetail {...commonDetailProps} section="reality" />
            </PigReportPanel>
          ),
          disease: (
            <PigReportPanel id={DISEASE_HEADING_ID}>
              <PigDiseaseContext product={product} />
            </PigReportPanel>
          ),
          price: (
            <PigReportPanel id={PRICE_HEADING_ID}>
              <PigDisclosureDetail {...commonDetailProps} section="price" />
            </PigReportPanel>
          ),
        }}
      />
      <ReportFoot analysisHref="/pig?tab=analysis" />
    </div>
  );
}
