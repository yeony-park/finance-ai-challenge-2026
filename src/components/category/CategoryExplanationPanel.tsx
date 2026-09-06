import type { CategoryExplanation } from "@/lib/content/category-methodology";
import s from "./CategoryAboutDiagrams.module.css";

export function CategoryExplanationPanel({ title, items, sourceNote }: CategoryExplanation) {
  return (
    <section className={s.panel} aria-label={title}>
      <h3 className={s.title}>{title}</h3>
      <dl className={s.items}>
        {items.map((item) => (
          <div key={item.label} className={s.item}>
            <dt className={s.label}>{item.label}</dt>
            <dd className={s.description}>{item.description}</dd>
          </div>
        ))}
      </dl>
      {sourceNote ? <p className={s.sourceNote}>{sourceNote}</p> : null}
    </section>
  );
}
