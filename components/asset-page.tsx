import type { ReactNode } from "react";
import { CopilotDemo } from "@/components/copilot-demo";
import { EvidenceIcon } from "@/components/icons";

export type EvidenceStatus = "verified" | "mismatch" | "review" | "missing" | "stale";

type EvidenceItem = {
  label: string;
  source: string;
  sourceUrl?: string;
  asOf?: string;
  description: string;
  limitation?: string;
  status: EvidenceStatus;
};

type ReportMetaItem = {
  label: string;
  value: string;
  detail?: string;
};

export type AssetPageProps = {
  icon: ReactNode;
  eyebrow: string;
  owner?: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  reportMeta?: ReportMetaItem[];
  evidence?: EvidenceItem[];
  evidenceTitle?: string;
  evidenceDescription?: string;
  evidenceBadge?: string;
  workflow?: Array<{ step: string; title: string; description: string }>;
  workflowDescription?: string;
  reviewQuestions?: string[];
  copilot?: {
    quickQuestions: string[];
    sampleResponse: string;
  };
  children?: ReactNode;
  disclaimer?: string;
};

const statusText: Record<EvidenceStatus, string> = {
  verified: "근거 확인",
  mismatch: "원문 간 차이",
  review: "추가 대조",
  missing: "자료 미확인",
  stale: "현재성 확인",
};

export function AssetPage({
  icon,
  eyebrow,
  owner,
  title,
  description,
  metrics,
  reportMeta,
  evidence,
  evidenceTitle = "공시와 외부 근거 연결 상태",
  evidenceDescription,
  evidenceBadge = "검토 항목",
  workflow,
  workflowDescription = "공시 사실과 외부 근거를 연결해 판정과 한계를 남기는 순서입니다.",
  reviewQuestions,
  copilot,
  children,
  disclaimer = "이 화면은 공시와 외부 근거의 검토를 지원하며, 매수·매도 권유나 수익률 예측 또는 공식 감정·법률 검토를 제공하지 않습니다.",
}: AssetPageProps) {
  return (
    <main className="asset-main">
      <section className="asset-hero shell">
        <div className={`asset-hero-grid${owner ? "" : " asset-hero-grid-no-owner"}`}>
          <div>
            <div className="asset-kicker"><span>{icon}</span>{eyebrow}</div>
            <h1 className="type-title">{title}</h1>
            <p className="type-main-text">{description}</p>
          </div>
          {owner ? (
            <aside className="owner-card" aria-label="페이지 담당 정보">
              <small>PAGE OWNER</small>
              <strong>{owner}</strong>
              <span>개별 라우트에서 독립 개발</span>
            </aside>
          ) : null}
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

        {reportMeta ? (
          <section className="report-meta" aria-label="검토 대상과 실행 정보">
            {reportMeta.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.detail ? <small>{item.detail}</small> : null}
              </div>
            ))}
          </section>
        ) : null}

        {children}

        {evidence?.length ? (
          <section className="content-card evidence-section" aria-labelledby="evidence-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Evidence map</p>
                <h2 className="type-subtitle" id="evidence-title">{evidenceTitle}</h2>
                {evidenceDescription ? <p className="section-description">{evidenceDescription}</p> : null}
              </div>
              <span className="sample-badge"><EvidenceIcon /> {evidenceBadge}</span>
            </div>
            <div className="evidence-list">
              {evidence.map((item) => (
                <article className="evidence-row" key={item.label}>
                  <div className={`status-dot ${item.status}`} aria-hidden="true" />
                  <div>
                    <h3 className="type-main-text">{item.label}</h3>
                    <p className="type-sub-text">{item.description}</p>
                    {item.limitation ? (
                      <p className="evidence-limitation"><strong>한계</strong> {item.limitation}</p>
                    ) : null}
                  </div>
                  <div className="evidence-source">
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source}</a>
                    ) : <span>{item.source}</span>}
                    {item.asOf ? <small>기준일 {item.asOf}</small> : null}
                    <strong className={`status-text ${item.status}`}>{statusText[item.status]}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {reviewQuestions?.length ? (
          <section className="content-card question-section" aria-labelledby="question-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Unresolved questions</p>
                <h2 className="type-subtitle" id="question-title">미확인 항목을 질문으로 남깁니다</h2>
              </div>
              <p className="type-sub-text">근거가 없는 답을 만들지 않고 다음 확인에 필요한 질문을 제시합니다.</p>
            </div>
            <ol className="review-question-list">
              {reviewQuestions.map((question, index) => (
                <li key={question}><span>{index + 1}</span><p>{question}</p></li>
              ))}
            </ol>
          </section>
        ) : null}

        {workflow?.length ? (
          <section className="content-card workflow-section" aria-labelledby="workflow-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Review flow</p>
                <h2 className="type-subtitle" id="workflow-title">검토 흐름</h2>
              </div>
              <p className="type-sub-text">{workflowDescription}</p>
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
        ) : null}

        {copilot ? (
          <CopilotDemo
            quickQuestions={copilot.quickQuestions}
            response={copilot.sampleResponse}
          />
        ) : null}

        <p className="page-disclaimer">{disclaimer}</p>
      </div>
    </main>
  );
}
