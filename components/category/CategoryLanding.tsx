import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import home from "@/components/home/home.module.css";
import s from "./category.module.css";

export interface CategoryLandingProps {
  title: string;
  lead: string;
  custom: ReactNode;
  customTitle: string;
}

/** The shared category landing contract. Keep the section order stable for every category. */
export function CategoryLanding({ title, lead, custom, customTitle }: CategoryLandingProps) {
  return <main id="main-content">
    <div className={`${home.wrap} ${s.landingHero}`}>
      <div className={s.landingHeroPhoto} aria-hidden="true"><Image src="/category-art.jpg" alt="" fill priority sizes="(max-width: 1088px) 1px, 55vw" className={s.landingHeroImg} /></div>
      <div className={s.landingHeroBody}><h1 className={home.sectionTitle}>{title}</h1><p className={home.sectionLead}>{lead}</p></div>
      <section className={s.slot} aria-labelledby={`${title}-evidence`}><div><h2 id={`${title}-evidence`} className={s.slotTitle}>공모별 확인 현황</h2><p className={s.slotLead}>검증 가능한 공개 데이터가 있는 공모 전수를 공시 접수일순 그대로 보여줍니다.</p><ul className={s.previewList}><li>대상 공모: 미술품 투자계약증권 5건 — 공모가 구성·공시 문서 좌표를 아래 확인 현황에 정리</li><li>공시 축: 증권신고서·투자설명서·발행실적보고서 원문 대조 (DART 링크)</li><li>원장 축: 독립 경매·보관 원장이 아직 연결되지 않아 해당 항목은 대조 불가로 표기</li></ul></div></section>
      <section className={s.slot} aria-labelledby={`${title}-verdicts`}><div><h2 id={`${title}-verdicts`} className={s.slotTitle}>지금까지의 대조 결과</h2><p className={s.emptyNote}>공개된 대조 결과가 아직 없습니다 — 검증 경로가 연결되면 같은 형식으로 표시됩니다.</p></div></section>
      <section className={s.slot} aria-labelledby={`${title}-layers`}><div><h2 id={`${title}-layers`} className={s.slotTitle}>무엇을 어디까지 대조하나</h2><p className={s.slotLead}>확인 질문마다 어떤 공공 데이터로 어디까지 대조하는지, 데이터 깊이의 차이까지 그대로 적습니다.</p><table className={s.layerTable}><thead><tr><th scope="col">확인 질문</th><th scope="col">지원</th><th scope="col">근거</th></tr></thead><tbody>{[["실물이 정말 있는가","실재성"],["가격이 시장 어디쯤인가","가격"],["공시한 대로 진행되고 있는가","이행"]].map(([question,layer])=><tr key={layer}><td className={s.layerName}>{question}<span className={s.layerSub}>{layer} 층</span></td><td><span className={`${s.layerLevel} ${s.layerLevelPending}`}>선언 대기</span></td><td className={s.layerBasis}>담당 구현에서 확정되면 그때부터 대조를 제공합니다.</td></tr>)}</tbody></table></div></section>
      <section className={s.slot} aria-labelledby={`${title}-questions`}><div><h2 id={`${title}-questions`} className={s.slotTitle}>확인 질문</h2><div className={s.questionList}><p>· 이 상품의 증권신고서가 전자공시(DART)에 제출돼 있나요?</p><p>· 공시에 적힌 기초자산을 공적 원장에서 확인할 수 있나요?</p><p>· 제출 후 정정신고서가 접수됐나요? 무엇이 바뀌었나요?</p></div><Link className={s.questionBridge} href="/#checklist">확인 질문 8가지 전체 보기 →</Link></div></section>
      <section className={s.slot} aria-labelledby={`${title}-custom`}><div><h2 id={`${title}-custom`} className={s.slotTitle}>{customTitle}</h2>{custom}</div></section>
    </div>
  </main>;
}
