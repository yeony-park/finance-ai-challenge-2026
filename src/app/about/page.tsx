import type { Metadata } from "next";
import Image from "next/image";

import { DATA_SOURCES } from "@/components/site/service";

import s from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "JeomJeom을 만든 이유와 조각투자 공시 대조 프로젝트를 함께 만든 팀을 소개합니다.",
};

const TEAM_MEMBERS = [
  { name: "박연정", image: "/category-art.jpg" },
  { name: "박현석", image: "/category-cattle.jpg" },
  { name: "신문수", image: "/category-pig.jpg" },
  { name: "최원준", image: "/category-real-estate.jpg" },
] as const;

const VERDICT_TERMS: readonly string[] = [
  "일치 — 공시 내용이 공공 데이터에서 확인됩니다",
  "원장 불일치 — 공시 기재와 공공 데이터의 값이 서로 다릅니다",
  "대조 불가 — 대조할 공공 데이터가 없거나 조회해도 확인되지 않습니다",
];

export default function AboutPage() {
  return (
    <>
      <section className={s.hero} aria-labelledby="about-title">
        <div className={s.wrap}>
          <p className={s.eyebrow}>ABOUT JEOMJEOM</p>
          <h1 id="about-title" className={s.title}>
            공시와 공공 기록 사이의 빈틈을 줄이기 위해 만들었습니다
          </h1>
          <p className={s.lead}>
            조각투자는 공시 자료만으로 기초자산과 조건을 바로 확인하기 어렵습니다.
            JeomJeom은 투자 판단을 대신하지 않고, 공시와 공공 데이터를 같은 화면에서
            대조할 수 있도록 만든 프로젝트입니다.
          </p>
        </div>
      </section>

      <div className={s.wrap}>
        <section className={s.story} aria-labelledby="about-story-title">
          <h2 id="about-story-title" className={s.sectionTitle}>
            왜 JeomJeom인가요
          </h2>
          <p className={s.storyBody}>
            정보가 부족한 투자 판단은 더 불안해질 수 있습니다. 그래서 신고서에 적힌 내용을
            공공 원장과 대조하고, 일치 여부와 근거를 한눈에 확인할 수 있는 흐름을 만들었습니다.
            확인할 수 없는 정보는 추정하지 않고, 대조할 수 없다는 사실 그대로 남깁니다.
          </p>
        </section>

        <section className={s.projectInfo} aria-labelledby="project-info-title">
          <h2 id="project-info-title" className={s.sectionTitle}>
            프로젝트 기준과 데이터 출처
          </h2>
          <div className={s.projectInfoBody}>
            <div className={s.projectInfoItem}>
              <h3 className={s.projectInfoTitle}>판정은 세 값</h3>
              <p className={s.projectInfoText}>{VERDICT_TERMS.join(". ")}</p>
            </div>
            <div className={s.projectInfoItem}>
              <h3 className={s.projectInfoTitle}>데이터 출처</h3>
              <ul className={s.sourceList}>
                {DATA_SOURCES.map((source) => (
                  <li key={source.name}>
                    {source.holder} — {source.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={s.team} aria-labelledby="team-title">
          <div className={s.teamHead}>
            <h2 id="team-title" className={s.sectionTitle}>
              함께 만든 사람들
            </h2>
            <p className={s.teamLead}>
              조각투자 공시를 더 투명하게 확인할 수 있는 경험을 함께 만들고 있습니다.
            </p>
          </div>

          <ol className={s.memberList}>
            {TEAM_MEMBERS.map((member, index) => (
              <li
                key={member.name}
                className={`${s.memberCard} ${index % 2 === 1 ? s.memberCardReverse : ""}`}
              >
                <div className={s.memberVisual}>
                  <Image
                    src={member.image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 45vw"
                    className={s.memberImage}
                  />
                  <span className={s.memberIndex} aria-hidden="true">
                    TEAM {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className={s.memberCopy}>
                  <p className={s.memberEyebrow}>JEOMJEOM TEAM</p>
                  <h3 className={s.memberName}>{member.name}</h3>
                  <p className={s.memberDescription}>
                    공시와 공공 기록을 연결해, 더 쉽게 확인할 수 있는 경험을 함께 설계합니다.
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
