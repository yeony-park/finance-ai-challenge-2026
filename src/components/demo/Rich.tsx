/**
 * 뷰 모델이 내려준 강조 구간(RichText)을 그대로 그린다 — 화면에서 문장을 만들지 않는다.
 */
import type { RichText } from "@/lib/verify/report/view-model";

export function Rich({ parts }: { parts: RichText }) {
  return (
    <>
      {parts.map((part, index) =>
        part.isStrong ? (
          <b key={`${index}-${part.text}`}>{part.text}</b>
        ) : (
          <span key={`${index}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
