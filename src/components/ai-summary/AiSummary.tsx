import type { AiSummaryDocument } from "@/lib/ai-summary/schema";

import styles from "./AiSummary.module.css";

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export function AiSummary({ summary }: { readonly summary: AiSummaryDocument }) {
  return (
    <section className={styles.summary} aria-label="AI 요약">
      <p className={styles.label}>AI 요약</p>
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
                      <code>{path}</code>
                      {summary.sentenceEvidenceExcerpts?.[index]?.[pathIndex]
                        ? <span className={styles.excerpt}>{summary.sentenceEvidenceExcerpts[index][pathIndex]}</span>
                        : null}
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
              {summary.sourceReferences.map((reference) => (
                <li key={reference}>
                  {isHttpUrl(reference)
                    ? <a href={reference} target="_blank" rel="noreferrer">원문 링크</a>
                    : <code>{reference}</code>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
