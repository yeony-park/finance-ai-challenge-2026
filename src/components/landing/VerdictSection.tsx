/**
 * 판정 3값 — 이 서비스가 낼 수 있는 결론의 전부를 먼저 못 박는다.
 * 단정하지 않는다는 원칙은 설명이 아니라 판정 값의 개수로 구현되어 있다.
 */
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";

import s from "./landing.module.css";

interface VerdictTerm {
  readonly term: string;
  readonly desc: string;
  readonly className: string;
}

export const VERDICT_TERMS: readonly VerdictTerm[] = [
  {
    term: "일치",
    desc: "신고서에 적힌 내용이 같은 항목의 공공 데이터에서 확인됩니다.",
    className: s.verdictItemMatch,
  },
  {
    term: "원장에서 확인되지 않음",
    desc: "공공 데이터에서 해당 내용이 확인되지 않았다는 사실만을 뜻합니다. 왜 그런지는 판정하지 않습니다.",
    className: s.verdictItemMiss,
  },
  {
    term: "확인 불가",
    desc: "대조할 공공 데이터가 없거나 아직 연결되지 않았습니다. 일치·불일치 어느 쪽으로도 세지 않습니다.",
    className: s.verdictItemUnknown,
  },
];

export function VerdictSection() {
  return (
    <section className={s.section} aria-labelledby="verdict-title">
      <Reveal className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>판정 언어</p>
          <h2 id="verdict-title" className={s.sectionTitle}>
            결론은 세 값뿐입니다
          </h2>
          <p className={s.sectionLead}>
            대조 결과를 좋고 나쁨의 언어로 옮기지 않습니다. 확인된 것과 확인되지 않은 것을 그대로
            세 값 중 하나로 적고, 모든 판정에는 원문 위치와 조회 응답이 근거로 붙습니다.
          </p>
        </div>

        <dl className={s.verdictStrip}>
          {VERDICT_TERMS.map((item) => (
            <div key={item.term} className={`${s.verdictItem} ${item.className}`}>
              <dt className={s.verdictTerm}>{item.term}</dt>
              <dd className={s.verdictDesc}>{item.desc}</dd>
            </div>
          ))}
        </dl>

        <p className={s.verdictFoot}>
          <span>근거 없이 내려간 판정은 리포트에 실리지 않습니다.</span>
          <Link href="/methodology" className={s.buttonGhost}>
            검증 방법 전문 읽기
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
