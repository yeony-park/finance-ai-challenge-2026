/**
 * 루트 로딩 상태 — 리포트가 도착하기 전 지면의 뼈대만 먼저 세운다.
 * 아직 아무것도 확인되지 않은 상태이므로 판정 수치를 흉내 내지 않는다.
 */
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
