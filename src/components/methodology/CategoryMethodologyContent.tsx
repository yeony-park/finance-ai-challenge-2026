import {
  ArtAnalysisScopeDiagram,
  ArtDisclosureOverviewDiagram,
} from "@/components/category/ArtAboutDiagrams";
import {
  AnalysisEvidenceDiagram,
  CattleCrossCheckDiagram,
} from "@/components/category/CattleAboutDiagrams";
import { CattleFlowBand } from "@/components/category/CattleFlowBand";
import { CategoryAboutView } from "@/components/category/CategoryAboutView";
import {
  PigAnalysisScopeDiagram,
  PigDisclosureOverviewDiagram,
} from "@/components/category/PigAboutDiagrams";
import {
  RealEstateAnalysisScopeDiagram,
  RealEstateVerificationOverviewDiagram,
} from "@/components/category/RealEstateAboutDiagrams";
import { PigAboutContent } from "@/components/pig/PigAboutContent";
import { categoryById, type CategoryId } from "@/lib/content/categories";
import { CATTLE_FLOW_TITLE } from "@/lib/content/cattle";
import { ART_PAGE_LEAD } from "@/lib/content/art";
import { METHODOLOGY_DATA_NOTICES } from "@/lib/content/category-methodology";
import { CATTLE_CATEGORY } from "@/lib/verify/contract/cattle";
import { PIG_CATEGORY } from "@/lib/verify/contract/pig";
import { REAL_ESTATE_CATEGORY } from "@/lib/verify/contract/real-estate";

export function CategoryMethodologyContent({
  categoryId,
}: {
  readonly categoryId: CategoryId;
}) {
  if (categoryId === "cattle") {
    return (
      <CategoryAboutView
        embedded
        title="한우"
        lead="공시된 개체를 축산물이력제 원장과 대조하고, 공모가의 시장 위치와 정정 이력을 함께 보여줍니다."
        descriptor={CATTLE_CATEGORY}
        heroImage={null}
        leadVisual={<CattleCrossCheckDiagram />}
        analysisHintVisual={<AnalysisEvidenceDiagram />}
        replaceCopyWithVisuals
        descriptionContentTitle={CATTLE_FLOW_TITLE}
        descriptionContent={<CattleFlowBand />}
      />
    );
  }

  if (categoryId === "pig") {
    return (
      <CategoryAboutView
        embedded
        title={categoryById("pig").label}
        lead="발행사가 DART에 공시한 한돈 STO 3개 회차를 공시 축으로 정리했습니다. 개체 이력번호가 없어 공공 원장과의 대조는 아직 열지 못했습니다 — 그 사실을 대조 불가로 그대로 표시합니다."
        descriptor={PIG_CATEGORY}
        heroImage={null}
        leadVisual={<PigDisclosureOverviewDiagram />}
        analysisHintVisual={<PigAnalysisScopeDiagram />}
        replaceCopyWithVisuals
        descriptionContent={<PigAboutContent />}
        descriptionContentTitle="한돈 공시는 어떻게 확인하나요?"
      />
    );
  }

  if (categoryId === "real-estate") {
    return (
      <CategoryAboutView
        embedded
        title="부동산"
        dataNotice={METHODOLOGY_DATA_NOTICES["real-estate"]}
        lead="종료된 공모의 사후 검증 리포트가 공개돼 있습니다 — 소재지·가격·이행을 공공 원장과 대조합니다."
        descriptor={REAL_ESTATE_CATEGORY}
        heroImage={null}
        leadVisual={<RealEstateVerificationOverviewDiagram />}
        analysisHintVisual={<RealEstateAnalysisScopeDiagram />}
        replaceCopyWithVisuals
        descriptionContent={null}
        descriptionContentTitle="카테고리 안내"
      />
    );
  }

  return (
    <CategoryAboutView
      embedded
      title={categoryById("art").label}
      dataNotice={METHODOLOGY_DATA_NOTICES.art}
      lead={ART_PAGE_LEAD}
      descriptor={null}
      heroImage={null}
      leadVisual={<ArtDisclosureOverviewDiagram />}
      analysisHintVisual={<ArtAnalysisScopeDiagram />}
      replaceCopyWithVisuals
      descriptionContent={null}
      descriptionContentTitle="카테고리 안내"
    />
  );
}
