import { SuitabilityQuestionnaire } from "@/components/suitability-questionnaire";

export default function SuitabilityPage() {
  return (
    <main className="catalog-page shell suitability-page">
      <header className="page-heading">
        <p className="section-label">NEUTRAL CHECKLIST</p>
        <h1>자료 확인 문항</h1>
        <p>상품 추천이나 점수 산정이 아닌, 화면의 한계와 출처 상태를 확인하는 중립적 문항입니다.</p>
      </header>
      <SuitabilityQuestionnaire />
    </main>
  );
}
