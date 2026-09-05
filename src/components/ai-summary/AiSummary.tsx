import type { AiSummaryDocument } from "@/lib/ai-summary/schema";
import { AiPanel } from "@/components/ai-assistant/AiPanel";

import styles from "./AiSummary.module.css";

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export function AiSummary({ summary, status = "idle" }: {
  readonly summary: AiSummaryDocument | null;
  readonly status?: "idle" | "loading" | "error";
}) {
  if (!summary || status !== "idle") {
    return (
      <AiPanel title="AI 요약" busy={status === "loading"}>
        <p className={styles.text} role={status === "error" ? "alert" : "status"}>
          {status === "loading" ? "요약을 불러오고 있습니다."
            : status === "error" ? "요약을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요."
              : "아직 등록된 요약이 없습니다."}
        </p>
      </AiPanel>
    );
  }
  return (
    <AiPanel title="AI 요약">
      <p className={styles.text}>{summary.sentences.join(" ")}</p>
      <details className={styles.evidence}>
        <summary>기준일 {summary.asOf} · 근거 보기</summary>
        <div className={styles.evidenceBody}>
          <ol className={styles.claims}>
            {summary.sentenceEvidencePaths.map((paths, index) => (
              <li key={`${index}-${paths.join("|")}`}>
                <span className={styles.claimLabel}>문장 {index + 1} 근거</span>
                <ul className={styles.paths}>
                  {paths.map((path, pathIndex) => (
                    <li key={path}>
                      {summary.sentenceEvidenceExcerpts?.[index]?.[pathIndex]
                        ? <span className={styles.excerpt}>{summary.sentenceEvidenceExcerpts[index][pathIndex]}</span>
                        : <span className={styles.excerpt}>연결된 상품 자료에서 확인한 내용입니다.</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className={styles.sources}>
            <span className={styles.claimLabel}>출처</span>
            {!summary.sourceReferences.some(isHttpUrl)
              ? <p className={styles.sourceNotice}>
                  {summary.dataNature === "scenario"
                    ? "외부 원문 링크 없음 · 합성 시나리오 자료"
                    : "외부 원문 링크 없음 · 연결된 내부 검증 자료"}
                </p>
              : null}
            <ul>
              {summary.sourceReferences.filter(isHttpUrl).map((reference) => (
                <li key={reference}>
                  <a href={reference} target="_blank" rel="noreferrer">원문 링크</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </AiPanel>
  );
}
