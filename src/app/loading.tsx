import s from "@/components/site/status.module.css";

export default function Loading() {
  return (
    <section className={s.wrap} aria-busy="true" aria-live="polite">
      <p className={s.code}>대조 결과를 불러오는 중</p>
      <div className={s.skeletonStack} aria-hidden="true">
        <div className={`${s.skeleton} ${s.skeletonWide}`} />
        <div className={`${s.skeleton} ${s.skeletonMid}`} />
        <div className={`${s.skeleton} ${s.skeletonCard}`} />
      </div>
    </section>
  );
}
