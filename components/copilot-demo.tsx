"use client";

import { FormEvent, useState } from "react";
import { ArrowIcon, EvidenceIcon, SparkIcon } from "@/components/icons";

type CopilotDemoProps = {
  quickQuestions: string[];
  response: string;
};

export function CopilotDemo({ quickQuestions, response }: CopilotDemoProps) {
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [answer, setAnswer] = useState(response);

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) return;

    setAnswer(response);
  }

  return (
    <section className="copilot-card" aria-labelledby="copilot-title">
      <div className="copilot-heading">
        <span className="copilot-icon"><SparkIcon /></span>
        <div>
          <p className="section-label">Evidence Copilot</p>
          <h2 className="type-subtitle" id="copilot-title">근거부터 확인해 보세요</h2>
        </div>
        <span className="demo-label">DEMO</span>
      </div>

      <div className="question-chips" aria-label="질문 예시">
        {quickQuestions.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)}>
            {item}
          </button>
        ))}
      </div>

      <form className="copilot-form" onSubmit={submitQuestion}>
        <label className="sr-only" htmlFor="copilot-question">Copilot 질문</label>
        <input
          id="copilot-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="공시와 외부 근거에 대해 질문하세요"
        />
        <button type="submit" aria-label="질문 보내기"><ArrowIcon /></button>
      </form>

      <div className="answer-box" aria-live="polite">
        <div className="answer-source"><EvidenceIcon /> 근거 연결형 응답 예시</div>
        <p>{answer}</p>
        <small>샘플 응답입니다. 실제 데이터·AI 연결 전에는 투자 판단에 사용할 수 없습니다.</small>
      </div>
    </section>
  );
}
