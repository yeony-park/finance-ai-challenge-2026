import { put } from "@vercel/blob";

import type { MonitorRun } from "./monitor";

export const EVENT_PREFIX = "amend-events";

export const MISSING_TOKEN_REASON =
  "BLOB_READ_WRITE_TOKEN이 설정되지 않아 이벤트를 저장하지 않았습니다 — 아래 events가 이번 확인의 전체 결과입니다.";

export interface EventStoreResult {
  readonly stored: boolean;
  readonly pathname?: string;
  readonly url?: string;
  readonly reason?: string;
}

export type EventStore = (run: MonitorRun) => Promise<EventStoreResult>;

export type BlobPut = (
  pathname: string,
  body: string,
  options: {
    readonly access: "private";
    readonly token: string;
    readonly contentType: string;
    readonly addRandomSuffix: false;
    readonly allowOverwrite: true;
  },
) => Promise<{ readonly pathname: string; readonly url: string }>;

export const eventPathname = (checkedAt: string): string =>
  `${EVENT_PREFIX}/${checkedAt.replace(/[:.]/g, "-")}.json`;

const defaultPut: BlobPut = (pathname, body, options) =>
  put(pathname, body, options);

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createBlobEventStore = (
  token: string | undefined,
  putImpl: BlobPut = defaultPut,
): EventStore => {
  return async (run) => {
    if (!token) return { stored: false, reason: MISSING_TOKEN_REASON };

    try {
      const result = await putImpl(
        eventPathname(run.checkedAt),
        `${JSON.stringify(run, null, 2)}\n`,
        {
          access: "private",
          token,
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: true,
        },
      );
      return { stored: true, pathname: result.pathname, url: result.url };
    } catch (error) {
      return {
        stored: false,
        reason: `이벤트 저장에 실패해 응답 본문으로만 반환합니다 — ${messageOf(error)}`,
      };
    }
  };
};
