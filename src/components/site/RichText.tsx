/**
 * 뷰 모델이 내려준 강조 구간(RichText)을 그대로 그린다 — 화면에서 문장을 만들지 않는다.
 * 어떤 구절을 강조할지는 검증 엔진이 이미 결정했고, 여기서는 마크업만 입힌다.
 */
import type { RichText as RichTextParts } from "@/lib/verify/report/view-model";

interface RichTextProps {
  readonly parts: RichTextParts;
  /** 강조 구간에 붙일 클래스 — 화면마다 강조 표현이 다르다 */
  readonly strongClassName?: string;
}

export function RichText({ parts, strongClassName }: RichTextProps) {
  return (
    <>
      {parts.map((part, index) =>
        part.isStrong ? (
          <strong key={`${index}-${part.text}`} className={strongClassName}>
            {part.text}
          </strong>
        ) : (
          <span key={`${index}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
