import type { ReactNode } from "react";
import { CopilotDemo } from "@/components/copilot-demo";
import { EvidenceIcon } from "@/components/icons";

export type EvidenceStatus = "verified" | "review" | "missing";

export type AssetPageProps = {
  icon: ReactNode;
  eyebrow: string;
  owner: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  evidence: Array<{
    label: string;
    source: string;
    description: string;
    status: EvidenceStatus;
  }>;
  workflow: Array<{ step: string; title: string; description: string }>;
  copilot?: {
    quickQuestions: string[];
    sampleResponse: string;
  };
};

const statusText: Record<EvidenceStatus, string> = {
  verified: "연결 가능",
  review: "대조 필요",
  missing: "미확인",
};

export function AssetPage({
  icon,
  eyebrow,
  owner,
  title,
  description,
  metrics,
  evidence,
  workflow,
  copilot,
}: AssetPageProps) {
  return (
    <main className="asset-main">
      <section className="asset-hero shell">
        <div className="asset-hero-grid">
          <div>
            <div className="asset-kicker"><span>{icon}</span>{eyebrow}</div>
            <h1 className="type-title">{title}</h1>
            <p className="type-main-text">{description}</p>
          </div>
          <aside className="owner-card" aria-label="페이지 담당 정보">
            <small>PAGE OWNER</small>
            <strong>{owner}</strong>
            <span>개별 라우트에서 독립 개발</span>
          </aside>
        </div>
      </section>

      <div className="shell asset-content">
        <section className="metric-grid" aria-label="화면 상태 요약">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="content-card evidence-section" aria-labelledby="evidence-title">
          <div className="section-heading">
            <div>
              <p className="section-label">Evidence map</p>
              <h2 className="type-subtitle" id="evidence-title">공시와 외부 근거 연결 상태</h2>
            </div>
            <span className="sample-badge"><EvidenceIcon /> 예시 항목</span>
          </div>
          <div className="evidence-list">
            {evidence.map((item) => (
              <article className="evidence-row" key={item.label}>
                <div className={`status-dot ${item.status}`} aria-hidden="true" />
                <div>
                  <h3 className="type-main-text">{item.label}</h3>
                  <p className="type-sub-text">{item.description}</p>
                </div>
                <div className="evidence-source">
                  <span>{item.source}</span>
                  <strong className={`status-text ${item.status}`}>{statusText[item.status]}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="content-card workflow-section" aria-labelledby="workflow-title">
          <div className="section-heading">
            <div>
              <p className="section-label">Review flow</p>
              <h2 className="type-subtitle" id="workflow-title">검토 흐름</h2>
            </div>
            <p className="type-sub-text">여기에 검토 흐름 설명을 넣어주세요.</p>
          </div>
          <div className="workflow-grid">
            {workflow.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <h3 className="type-main-text">{item.title}</h3>
                <p className="type-sub-text">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {copilot ? (
          <CopilotDemo
            quickQuestions={copilot.quickQuestions}
            response={copilot.sampleResponse}
          />
        ) : null}

        <p className="page-disclaimer">
          이 화면은 팀 개발을 위한 초기 UI입니다. 표시된 상태와 설명은 실제 투자상품 분석 결과가 아니며,
          매수·매도 권유나 공식 감정·법률 검토를 제공하지 않습니다.
        </p>
      </div>
    </main>
  );
}
