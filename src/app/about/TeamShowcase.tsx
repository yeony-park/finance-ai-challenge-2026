"use client";

import { useRef, useState, type CSSProperties } from "react";
import s from "./about.module.css";

const TEAM_MEMBERS = [
  { name: "박연정", area: "프론트엔드 · 한돈", github: "yeony-park", introduction: "흩어진 정보를 한눈에 읽을 수 있는 화면으로 만듭니다.", description: "한돈 공시 자료를 정리하고, 카테고리마다 다른 화면과 동작을 하나의 경험으로 연결합니다. 사용자가 근거를 찾고 다음 정보를 확인하는 흐름을 다듬고 있습니다." },
  { name: "박현석", area: "미술품 분석", github: "hyonsho", introduction: "작품의 가격부터 회수 이력까지, 숫자에 맥락을 더합니다.", description: "미술품의 공모 조건과 유사 작품, 작가·플랫폼 이력을 함께 살펴볼 수 있도록 분석 화면을 만듭니다. 합성 데이터의 계산과 시각화를 연결해 비교할 수 있는 근거를 정리합니다." },
  { name: "최원준", area: "한우 · 인프라", github: "cwj0666", introduction: "한우 데이터를 연결하고, 서비스가 안정적으로 동작할 기반을 만듭니다.", description: "한우 공모 자료와 상품 목록을 연결하고, 서비스 인프라를 담당합니다. 데이터와 요청이 안정적으로 이어지도록 운영 기반을 다듬습니다." },
  { name: "신문수", area: "부동산 · AI", github: "MunSu2001", introduction: "건물의 공개정보와 상품 조건 사이에 근거를 연결합니다.", description: "부동산 시나리오와 공개 문서를 정리하고, 상품별 AI 요약과 근거 질문 기능을 연결합니다. 확인된 내용과 아직 확인하지 못한 범위를 함께 전달하는 데 집중합니다." },
] as const;

export function TeamShowcase() {
  const [selected, setSelected] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const member = TEAM_MEMBERS[selected];

  const selectMember = (index: number) => {
    setSelected(index);
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  };
  return (
    <section className={s.team} aria-labelledby="team-title">
      <div className={s.teamStage}>
        <div className={s.wrap}>
          <header className={s.teamHead}>
            <h2 id="team-title">함께 만든 사람들</h2>
          </header>
          <ul className={s.memberList}>
            {TEAM_MEMBERS.map((item, index) => (
              <li key={item.github}>
                <button type="button" className={s.memberButton}
                  style={{ "--avatar-x": `${index * 100 / 3}%` } as CSSProperties}
                  aria-label={`${item.name} 소개`} aria-pressed={selected === index}
                  aria-controls="team-member-introduction" onClick={() => selectMember(index)}>
                  <span className={s.avatar} aria-hidden="true" />
                  <span className={s.memberCaption}>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={s.wrap}>
        <div ref={detailRef} id="team-member-introduction" className={s.memberDetail} aria-live="polite" aria-atomic="true">
          <div>
            <p className={s.memberRole}>{member.area}</p>
            <h3 className={s.memberName}>{member.name}</h3>
            <a className={s.githubLink} href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} GitHub 프로필 (새 창)`}>
              GitHub <span>@{member.github}</span><span aria-hidden="true">↗</span>
            </a>
          </div>
          <div>
            <p className={s.memberIntroduction}>{member.introduction}</p>
            <p className={s.memberDescription}>{member.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
