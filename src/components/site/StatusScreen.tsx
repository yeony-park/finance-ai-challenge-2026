/**
 * 상태 화면 껍데기 — 404·오류가 공유한다.
 * 실패 화면에서도 표현 원칙은 같다: 무엇이 확인되지 않았는지만 적고 원인을 단정하지 않는다.
 */
import type { ReactNode } from "react";

import s from "./status.module.css";

interface StatusScreenProps {
  /** 모노 캡션 — 상태 코드나 상황 라벨 */
  readonly code: string;
  readonly title: string;
  readonly children: ReactNode;
  /** 링크·버튼 등 다음 행동 */
  readonly actions?: ReactNode;
}

export function StatusScreen({ code, title, children, actions }: StatusScreenProps) {
  return (
    <section className={s.wrap} aria-labelledby="status-title">
      <p className={s.code}>{code}</p>
      <h1 id="status-title" className={s.title}>
        {title}
      </h1>
      {children}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </section>
  );
}
