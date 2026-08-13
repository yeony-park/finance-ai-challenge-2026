"use client";

import { FormEvent, useState } from "react";

const questions = [
  "원금 손실 가능성과 상품별 처분·거래 중단 가능성을 확인했습니다.",
  "표시된 기준일과 출처 상태가 현재 상황과 다를 수 있음을 확인했습니다.",
  "공시·플랫폼 표시값과 독립 검증된 사실을 구분해 읽겠습니다.",
  "가격 적정성 판정 보류가 매수·매도 의견을 뜻하지 않음을 확인했습니다.",
  "자금 필요 시점과 손실 감내 범위는 별도의 본인 판단과 필요 시 자격 있는 전문가 상담으로 확인하겠습니다.",
];

export function SuitabilityQuestionnaire() {
  const [checked, setChecked] = useState<boolean[]>(() => questions.map(() => false));
  const [submitted, setSubmitted] = useState(false);
  const completed = checked.every(Boolean);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form className="questionnaire" onSubmit={onSubmit}>
      <fieldset>
        <legend>자료 확인 문항</legend>
        <p>응답은 브라우저에만 유지되며 저장하거나 적합·부적합 판정을 만들지 않습니다.</p>
        {questions.map((question, index) => (
          <label className="question-row" key={question}>
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={(event) => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
            />
            <span><strong>{String(index + 1).padStart(2, "0")}</strong>{question}</span>
          </label>
        ))}
      </fieldset>
      <button className="primary-button" type="submit" disabled={!completed}>확인 내용 보기</button>
      {submitted && completed ? <p className="questionnaire-result" role="status">[팩트] 모든 문항에 응답했습니다. 이 결과는 투자 적합성, 청약 가능 여부 또는 투자 권유를 뜻하지 않습니다.</p> : null}
    </form>
  );
}
