"use client";

import {
  NARRATIVE_LAYER_LABEL,
  NARRATIVE_LAYERS,
  NARRATIVE_TAG_LABEL,
  type NarrativeLevel,
  type NarrativeSentence,
  type NarrativeTag,
} from "@/lib/verify/narrative/types";

import s from "./report.module.css";

const TAG_CLASS: Record<NarrativeTag, string> = {
  fact: s.tagFact,
  issuer_claim: s.tagIssuer,
  calc: s.tagCalc,
  ai: s.tagAi,
};

const AI_NOTICE =
  "이 서술은 대조 엔진이 낸 판정 결과를 바탕으로 AI가 미리 작성해 둔 문장입니다. 판정 자체는 AI가 만들지 않으며, [AI 해석] 표시는 원문·원장·계산 어느 쪽에도 직접 대응하지 않는 정리 문장을 뜻합니다.";

function SentenceLine({ sentence }: { readonly sentence: NarrativeSentence }) {
  return (
    <li className={s.narrativeLine}>
      <span className={`${s.narrativeTag} ${TAG_CLASS[sentence.tag]}`}>
        {NARRATIVE_TAG_LABEL[sentence.tag]}
      </span>
      <span className={s.narrativeText}>{sentence.text}</span>
    </li>
  );
}

export function VerdictNarrative({ level }: { readonly level: NarrativeLevel }) {
  const layers = NARRATIVE_LAYERS.filter(
    (layer) => level.layers[layer].length > 0,
  );

  return (
    <div className={s.narrative}>
      {level.overall.length > 0 ? (
        <ul className={s.narrativeOverall}>
          {level.overall.map((sentence) => (
            <SentenceLine key={sentence.text} sentence={sentence} />
          ))}
        </ul>
      ) : null}

      {layers.length > 0 ? (
        <dl className={s.narrativeLayers}>
          {layers.map((layer) => (
            <div key={layer} className={s.narrativeLayer}>
              <dt className={s.narrativeLayerLabel}>
                {NARRATIVE_LAYER_LABEL[layer]}
              </dt>
              <dd>
                <ul className={s.narrativeLayerList}>
                  {level.layers[layer].map((sentence) => (
                    <SentenceLine key={sentence.text} sentence={sentence} />
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className={s.narrativeNotice}>{AI_NOTICE}</p>
    </div>
  );
}
