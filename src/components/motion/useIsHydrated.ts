"use client";

/**
 * 하이드레이션이 끝났는지 알려 주는 훅.
 *
 * 서버 스냅샷은 false, 클라이언트 스냅샷은 true다. React는 하이드레이션 렌더에서 서버 값을 쓰고
 * 그 뒤 클라이언트 값으로 한 번 갱신한다 — 즉 첫 렌더의 마크업이 서버와 반드시 일치한다.
 *
 * 브라우저에만 있는 정보(모션 축소 설정 등)를 마크업에 반영해야 할 때 이 훅으로 시점을 미룬다.
 * 구독할 외부 변화가 없으므로 subscribe는 아무것도 하지 않는다.
 */
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
