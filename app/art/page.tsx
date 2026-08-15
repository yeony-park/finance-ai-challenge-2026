import type { Metadata } from "next";
import { ArtEvidenceCatalog } from "@/components/art-evidence-catalog";
import { AssetPage } from "@/components/asset-page";
import { ArtIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "미술품 조각투자 공시 대조",
  description: "미술품 조각투자 상품의 공모가격, 작품 식별, 보유 상태와 플랫폼 이력을 원문 근거에 연결합니다.",
};

export default function ArtPage() {
  return (
    <AssetPage
      icon={<ArtIcon />}
      eyebrow="미술품"
      owner="현석"
      title="미술품 공시 대조"
      description="미술품 상품을 갤러리처럼 살펴본 뒤, 공모가격·작품 식별·현재 보유 상태가 원문과 외부 근거에 맞는지 주장별로 확인합니다."
      metrics={[
        {
          label: "운용 상태 추적",
          value: "5건",
          detail: "현석 브랜치의 투게더아트 상품을 공시 검토 카드로 정규화했습니다.",
        },
        {
          label: "현재 진행·예정 청약",
          value: "0건",
          detail: "DART·투게더아트·아트앤가이드 공개 목록 기준입니다.",
        },
        {
          label: "플랫폼 배경자료",
          value: "338건",
          detail: "아트앤가이드 187건 · 아트투게더 145건 · TESSA 6건",
        },
      ]}
      reportMeta={[
        {
          label: "원본 브랜치",
          value: "origin/hyunsuk",
          detail: "commit 585b371",
        },
        {
          label: "공개 청약 확인",
          value: "2026. 8. 15.",
          detail: "DART·투게더아트·아트앤가이드 공개 목록 기준",
        },
        {
          label: "플랫폼 저장본",
          value: "2026. 8. 10.",
          detail: "플랫폼 자체 게시 배경자료",
        },
        {
          label: "이식 원칙",
          value: "자료 상태로 표현",
          detail: "추천성 등급은 제외하고 근거·한계만 반영",
        },
      ]}
      evidenceTitle="미술품 검토 축"
      evidenceDescription="공모금액의 산술 연결과 작품 가치의 적정성, 플랫폼 상태와 현재 소유 여부를 서로 다른 주장으로 다룹니다."
      evidenceBadge="hyunsuk 자료 반영"
      evidence={[
        {
          label: "김환기 Untitled의 동일 작품 식별",
          source: "DART + KYS 2025 원문",
          sourceUrl: "https://artprice.kr/data_archive/20260312_132032_cf7c4a16.pdf#page=6",
          asOf: "2026-05-13",
          description: "보고 낙찰가 5.5억원, 취득가 6억원, 공모가 6.85억원의 가격 연결은 확인했습니다.",
          limitation: "일반 작품명만으로는 부족하며 lot 번호와 provenance가 없어 동일 작품 연결을 확정하지 않습니다.",
          status: "review",
        },
        {
          label: "하종현 Conjunction 20-65의 공모가격 구성",
          source: "DART 정정신고서",
          sourceUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391",
          asOf: "2026-05-12",
          description: "취득가 203,760,000원과 발행비용 21,240,000원의 합계가 공모가 225,000,000원과 일치합니다.",
          limitation: "가격 구성의 일치는 작품 가치의 적정성이나 향후 처분 가능성을 뜻하지 않습니다.",
          status: "verified",
        },
        {
          label: "유영국 Work의 현재 상태와 비교거래",
          source: "정기공시 저장본",
          sourceUrl: "https://dzb2k3770zezk.cloudfront.net/file/data/board/disclosure/20260401/202604011737122e7aabd8-718f-44cb-967e-9801efd9f3e1.pdf",
          asOf: "2025-12-31",
          description: "공모가 6.6억원은 저장돼 있으나 취득가가 연결되지 않았고 현재 상품 상태를 다시 확인해야 합니다.",
          limitation: "7억원 낙찰 사례는 다른 작품이므로 현재 상품과의 가격 차이를 계산하지 않습니다.",
          status: "stale",
        },
        {
          label: "쿠사마·조지 콘도 작품의 현재 보유 상태",
          source: "DART + 플랫폼 상품 저장본",
          sourceUrl: "https://weshareart.com/goods/subscription/detail/169",
          asOf: "2026-08-08",
          description: "두 상품 모두 취득가와 비용의 합계가 공모금액과 일치하며 플랫폼 상태는 STORED로 저장돼 있습니다.",
          limitation: "STORED는 현재 소유권·보관 상태·미처분을 독립적으로 증명하지 않으므로 최신 보유·보험 증빙이 필요합니다.",
          status: "missing",
        },
      ]}
      reviewQuestions={[
        "작품을 유일하게 식별할 lot 번호·provenance·감정서 식별번호가 원문 사이에서 일치하나요?",
        "취득가와 발행비용 외에 총 공모금액을 구성하는 비용이 빠짐없이 공개됐나요?",
        "현재 소유·보관·보험 상태를 확인할 수 있는 최신 기준일의 독립 증빙이 있나요?",
        "플랫폼의 매각 완료와 법적 청산 완료가 각각 어떤 원문으로 확인되나요?",
      ]}
      workflowDescription="현석 브랜치의 저장본을 추천 모델에 넣지 않고, 현재 공통 evidence 구조에 맞춰 다시 분류했습니다."
      workflow={[
        {
          step: "01",
          title: "상품과 법적 주체를 구분합니다",
          description: "플랫폼 브랜드, 운영사, 법적 발행사와 작품 식별자를 별도 필드로 확인합니다.",
        },
        {
          step: "02",
          title: "가격 체인을 계산합니다",
          description: "취득가·발행비용·공모금액을 분리하고 결측값을 감정가나 0으로 대체하지 않습니다.",
        },
        {
          step: "03",
          title: "작품과 시장 근거를 대조합니다",
          description: "동일 작품과 유사 작품을 구분하고 작품 식별이 불충분하면 비교 필요로 남깁니다.",
        },
        {
          step: "04",
          title: "보유·처분 상태를 다시 확인합니다",
          description: "플랫폼 상태와 실제 소유·보관·매각·청산 증빙을 같은 의미로 합치지 않습니다.",
        },
      ]}
      disclaimer="현석 브랜치의 공개자료 저장본을 2026년 8월 15일 현재 구조로 옮긴 화면입니다. 현재 진행·예정 청약 0건은 DART 공모게시판과 투게더아트·아트앤가이드 공개 목록 범위이며, 앱 내부 비공개·사모 상품은 포함하지 않습니다. 원문 기준일 이후 상태는 달라질 수 있으며 이 화면은 투자 권유나 작품의 진위·가치 감정을 제공하지 않습니다."
    >
      <ArtEvidenceCatalog />
    </AssetPage>
  );
}
