/**
 * 404 — 아직 만들어지지 않은 리포트 경로도 여기로 온다.
 * "없다"가 아니라 "이 주소에서는 확인되지 않는다"로 적는다.
 */
import Link from "next/link";

import { StatusScreen } from "@/components/site/StatusScreen";
import s from "@/components/site/status.module.css";

export default function NotFound() {
  return (
    <StatusScreen
      code="404 · Not Found"
      title="이 주소에서는 리포트가 확인되지 않습니다"
      actions={
        <>
          <Link href="/" className={s.actionPrimary}>
            공개된 검증 리포트 보기
          </Link>
          <Link href="/methodology" className={s.actionGhost}>
            검증 방법
          </Link>
        </>
      }
    >
      <p className={s.body}>
        주소가 잘못되었거나, 해당 공모의 리포트가 아직 공개되지 않았을 수 있습니다.
      </p>
    </StatusScreen>
  );
}
