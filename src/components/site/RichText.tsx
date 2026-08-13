import type { RichText as RichTextParts } from "@/lib/verify/report/view-model";

interface RichTextProps {
  readonly parts: RichTextParts;
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
