"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import s from "./ArtistHistoryDialog.module.css";
import detailStyles from "./synthetic-art.module.css";

export function ArtistHistoryDialog({ children }: { readonly children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const titleId = useId();

  useEffect(() => () => {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
    }
  }, []);

  const open = () => {
    dialogRef.current?.showModal();
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  };

  const restore = () => {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <button ref={triggerRef} type="button" className={detailStyles.secondaryButton} onClick={open} aria-haspopup="dialog">
        작가 전체 이력
      </button>
      <dialog ref={dialogRef} className={s.dialog} aria-labelledby={titleId} onClose={restore}>
        <header className={s.toolbar}>
          <h2 id={titleId}>작가 전체 이력</h2>
          <button type="button" className={s.close} aria-label="작가 전체 이력 닫기" onClick={() => dialogRef.current?.close()}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={s.content}>{children}</div>
      </dialog>
    </>
  );
}
