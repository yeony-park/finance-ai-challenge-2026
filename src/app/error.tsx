"use client";

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
