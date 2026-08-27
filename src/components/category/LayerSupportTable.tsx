import {
  LAYER_EASY_QUESTIONS,
  LAYERS_SECTION_LEAD,
  LAYERS_SECTION_TITLE,
} from "@/lib/content/category-landing";
import type { CategoryDescriptor, VerificationLayer } from "@/lib/verify/contract/category";
import {
  LAYER_LABELS,
  LAYER_SUPPORT_LABELS,
} from "@/lib/verify/contract/category";

import s from "./category.module.css";

const ALL_LAYERS: readonly VerificationLayer[] = [
  "existence",
  "price",
  "performance",
];

export function LayerSupportTable({
  descriptor,
  headingId,
  title = LAYERS_SECTION_TITLE,
}: {
  readonly descriptor: CategoryDescriptor | null;
  readonly headingId: string;
  readonly title?: string;
}) {
  return (
    <>
      <h2 id={headingId} className={s.slotTitle}>
        {title}
      </h2>
      <p className={s.slotLead}>{LAYERS_SECTION_LEAD}</p>
      <div className={s.layerTableFrame}>
        <table className={s.layerTable}>
          <thead>
            <tr>
              <th scope="col">확인 질문</th>
              <th scope="col">지원</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            {ALL_LAYERS.map((layer) => {
              const declared = descriptor?.layers.find(
                (entry) => entry.layer === layer,
              );
              return (
                <tr key={layer}>
                  <td className={s.layerName}>
                    {LAYER_EASY_QUESTIONS[layer]}
                    <span className={s.layerSub}>
                      {LAYER_LABELS[layer]} 층
                    </span>
                  </td>
                  <td>
                    <span
                      className={s.layerLevel}
                      data-level={declared?.level ?? "pending"}
                    >
                      {declared
                        ? LAYER_SUPPORT_LABELS[declared.level]
                        : "선언 대기"}
                    </span>
                  </td>
                  <td className={s.layerBasis}>
                    {declared
                      ? declared.basis
                      : "담당 구현에서 확정되면 그때부터 대조를 제공합니다."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {descriptor ? (
        <p className={s.slotLead}>현재성 기준: {descriptor.freshnessNote}.</p>
      ) : null}
    </>
  );
}
