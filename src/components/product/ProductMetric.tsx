import s from "./product-metric.module.css";

export function ProductMetric({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}) {
  return (
    <dl className={s.metric}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note ? <dd className={s.note}>{note}</dd> : null}
    </dl>
  );
}
