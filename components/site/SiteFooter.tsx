import Link from "next/link";
import { OnboardingOpenButton } from "./OnboardingOpenButton";
import s from "./shell.module.css";

const nav = [["/cattle", "한우"], ["/pig", "한돈"], ["/art", "미술품"], ["/real-estate", "부동산"], ["/offers", "검증 리포트"], ["/methodology", "검증 방법"]] as const;
const verdicts = [
  "일치 — 공시 내용이 공공 데이터에서 확인됩니다",
  "원장 불일치 — 공시 기재와 공공 데이터의 값이 서로 다릅니다",
  "대조 불가 — 대조할 공공 데이터가 없거나 조회해도 확인되지 않습니다",
] as const;
const sources = [
  ["전자공시(DART) 증권신고서·정정신고서", "금융감독원"],
  ["축산물이력제 개체정보", "축산물품질평가원"],
  ["축산물 등급판정·경락 정보", "축산물품질평가원"],
  ["상업업무용 부동산 매매 신고 자료(실거래가)", "국토교통부"],
] as const;

export function SiteFooter() {
  return <footer className={s.footer}><div className={s.inner}>
    <div className={s.footerGrid}>
      <div>
        <p className={s.footerBrand}>JeomJeom</p>
        <p className={s.footerTagline}>조각투자 공시 대조 검증 · 증권신고서와 국가 공공데이터 대조</p>
        <ul className={s.footerNavList}>{nav.map(([href, label]) => <li key={href}><Link href={href} className={s.footerLink}>{label}</Link></li>)}</ul>
        <OnboardingOpenButton className={s.footerAction} />
      </div>
      <div><h2 className={s.footerHeading}>판정은 세 값</h2><ul className={s.footerList}>{verdicts.map((term) => <li key={term}><span className={s.footerListMark} aria-hidden="true">·</span><span>{term}</span></li>)}</ul></div>
      <div><h2 className={s.footerHeading}>데이터 출처</h2><ul className={s.footerList}>{sources.map(([name, holder]) => <li key={name}><span className={s.footerListMark} aria-hidden="true">·</span><span>{name}<span className={s.footerListNote}>{holder} · 공개 데이터</span></span></li>)}</ul></div>
    </div>
    <div className={s.disclaimer}>
      <p><span className={s.disclaimerStrong}>본 서비스는 투자를 권유하지 않으며 자문·중개를 제공하지 않습니다. 투자 판단과 책임은 이용자에게 있습니다.</span></p>
      <p>AI가 생성한 안내에는 오류가 있을 수 있습니다. 원문 출처를 함께 확인하세요.</p>
      <p>&apos;검증&apos;은 공시와 공공 원장의 대조에 한정되며, 상품의 진위·가치·수익을 보증하지 않습니다.</p>
      <p>본 서비스는 법률·세무 자문을 제공하지 않습니다.</p>
      <p>본 서비스는 발행사·판매 플랫폼과 독립적으로 운영됩니다.</p>
      <p>대조 결과가 “원장 불일치”라는 것은 해당 시점의 공개 기록과 값이 다르다는 사실만을 뜻하며, 그 원인이나 의도를 단정하지 않습니다. <span className={s.disclaimerStrong}>자료가 부족하다는 사실 자체는 부정적 판단의 근거가 아닙니다.</span> 판정 기준과 한계는 <Link href="/methodology" className={s.footerLink}>검증 방법</Link>에서 확인할 수 있습니다.</p>
      <p>화면에 표시되는 발행사명·이력번호·소재지는 익명화 처리된 상태입니다.</p>
    </div>
    <p className={s.colophon}><span>© 2026 JeomJeom (가칭)</span><span>익명화 적용</span><span>2026 금융 AI Challenge 출품</span></p>
  </div></footer>;
}
