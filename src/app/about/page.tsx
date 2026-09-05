import type { Metadata } from "next";
import Link from "next/link";
import { DATA_SOURCES } from "@/components/site/service";
import { TeamShowcase } from "./TeamShowcase";
import s from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "공시와 공공 기록을 연결하는 JeomJeom, 그리고 함께 만드는 네 사람을 소개합니다.",
};

export default function AboutPage() {
  return (
    <>
      <section className={`${s.wrap} ${s.hero}`} aria-labelledby="about-title">
        <h1 id="about-title" className={s.title}>ABOUT</h1>
        <div className={s.heroCopy}>
          <h2>기록을 연결하고,<br />확신에 가까워지도록.</h2>
          <p>공시에 적힌 내용은 실제 기록과 같을까요?<br />JeomJeom은 조각투자 공시와 공공 데이터를 한곳에서 대조합니다.
            확인된 사실과 남은 질문을 함께 보여줍니다.</p>
        </div>
      </section>
      <TeamShowcase />
      <div className={s.wrap}>
        <section className={s.story} aria-labelledby="about-story-title">
          <h2 id="about-story-title" className={s.sectionTitle}>더 쉽게 읽고,<br />직접 확인할 수 있도록.</h2>
          <div className={s.storyCopy}>
            <p>공시 문서 하나를 읽는 데도 많은 시간과 배경지식이 필요합니다.
              그 안에 적힌 자산과 조건이 실제 기록과 일치하는지 확인하는 일은 더 어렵습니다.</p>
            <p>우리는 이 과정을 조금 더 짧고 명확하게 만들고 싶었습니다.
              투자 판단을 대신하는 대신, 판단에 필요한 근거를 가까이에 둡니다.
              확인할 수 없는 정보는 추정하지 않고 그대로 남깁니다.</p>
            <Link className={s.textLink} href="/methodology">검증 방법 살펴보기 <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
        <section className={s.projectInfo} aria-labelledby="project-info-title">
          <h2 id="project-info-title" className={s.sectionTitle}>우리가 확인하는 것</h2>
          <div className={s.projectInfoBody}>
            <div className={s.verdictGrid}>
              <div><h3>일치</h3><p>공시 내용이 공공 데이터에서 확인됩니다.</p></div>
              <div><h3>원장 불일치</h3><p>공시 기재와 공공 데이터의 값이 서로 다릅니다.</p></div>
              <div><h3>대조 불가</h3><p>대조할 공공 데이터가 없거나 조회해도 확인되지 않습니다.</p></div>
            </div>
            <details className={s.sources}>
              <summary>데이터 출처</summary>
              <ul>{DATA_SOURCES.map((source) => <li key={source.name}>{source.holder} — {source.name}</li>)}</ul>
            </details>
          </div>
        </section>
      </div>
    </>
  );
}
