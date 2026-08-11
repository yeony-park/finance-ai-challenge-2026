"use client";

/**
 * 루트 오류 경계 — Next 16의 error 파일 규약(props는 `error`와 `retry`).
 * 실패 원인을 화면에서 추정하지 않는다. 서버 상세는 digest만 보여 준다.
 */
import Link from "next/link";
import { useEffect } from "react";

import { StatusScreen } from "@/components/site/StatusScreen";
import s from "@/components/site/status.module.css";

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}

export default function RootError({ error, retry }: ErrorProps) {
  useEffect(() => {
    // 상세 맥락은 서버 로그에 남긴다 — 화면에는 추적용 digest만 노출한다
    console.error("[render error]", error);
  }, [error]);

  return (
    <StatusScreen
      code="Error · 화면을 그리지 못했습니다"
      title="리포트를 불러오는 중 문제가 생겼습니다"
      actions={
        <>
          <button type="button" onClick={() => retry()} className={s.actionPrimary}>
            다시 시도
          </button>
          <Link href="/" className={s.actionGhost}>
            처음 화면으로
          </Link>
        </>
      }
    >
      <p className={s.body}>
        검증 결과가 잘못되었다는 뜻은 아닙니다. 화면을 그리는 과정에서 실패한 것이며, 다시 시도하면
        해결되는 경우가 많습니다.
      </p>
      {error.digest ? <p className={s.detail}>추적 번호 · {error.digest}</p> : null}
    </StatusScreen>
  );
}
