/**
 * 검증 방법 3층위 — ①실재 확인 ②가격 위치 ③이행 이력.
 * 각 층위의 출처 문구는 뷰 모델이 실제로 어떤 데이터를 붙였는지 그대로 가져온다.
 * 아직 어댑터가 붙지 않은 층위는 그 사실이 출처 문구에 드러난다.
 */
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import type { DemoView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";

interface Layer {
  readonly no: string;
  readonly title: string;
  readonly body: string;
  /** 뷰 모델이 붙인 출처 문구 — 연결 여부까지 여기에 드러난다 */
  readonly source: string;
}

const buildLayers = (view: DemoView): readonly Layer[] => [
  {
    no: "01",
    title: "실재 확인",
    body: "신고서가 기초자산이라고 적은 개체가 국가 원장에 실제로 등록되어 있는지, 품종·성별·취득 시점·보관 장소가 원장 기록과 같은지 개체 단위로 대조합니다.",
    source: view.reality.source,
  },
  {
    no: "02",
    title: "가격 위치",
    body: "공시된 취득원가가 같은 시기 시장 어디쯤에 있는지 대조합니다. 대조할 공공 데이터가 붙기 전까지는 값을 추정하지 않고 대조 불가로 남깁니다.",
    source: view.price.source,
  },
  {
    no: "03",
    title: "이행 이력",
    body: "어떤 문서를 언제 대조했는지, 같은 공모의 리포트가 몇 번 갱신됐는지 기록합니다. 발행사가 과거에 낸 문서와 실제 결과를 나란히 놓기 위한 층위입니다.",
    source: view.history.source,
  },
];

export function MethodSection({ view }: { view: DemoView }) {
  const layers = buildLayers(view);

  return (
    <section className={s.section} aria-labelledby="method-title">
      <Reveal className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>검증 방법</p>
          <h2 id="method-title" className={s.sectionTitle}>
            세 층위로 나누어 대조합니다
          </h2>
          <p className={s.sectionLead}>
            문서 한 건을 통째로 평가하지 않습니다. 검증 가능한 주장 단위로 쪼갠 다음, 층위별로 각각
            다른 공공 데이터에 물어봅니다.
          </p>
        </div>

        <div className={s.layerGrid}>
          {layers.map((layer) => (
            <article key={layer.no} className={s.layerCard}>
              <p className={s.layerNo}>{layer.no}</p>
              <h3 className={s.layerTitle}>{layer.title}</h3>
              <p className={s.layerBody}>{layer.body}</p>
              <p className={s.layerSource}>{layer.source}</p>
            </article>
          ))}
        </div>

        <p className={s.verdictFoot}>
          <Link href="/methodology" className={s.buttonGhost}>
            판정 기준과 한계 읽기
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
