import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  isPublicVerificationDocumentAllowed,
  isPublicVerificationScopeAllowed,
} from "../dart/onboarding-catalog";
import { assertOfferId } from "../paths";
import type { AmendmentEvent } from "./monitor";

const WATCH_SECTION = "watch";

const WATCH_FILE_PATTERN = /^watch-.*\.json$/;

const amendmentSchema = z.object({
  rcpNo: z.string(),
  receivedOn: z.string(),
  reportName: z.string(),
});

const watchStateSchema = z.object({
  offerId: z.string(),
  checkedAt: z.string(),
  baseRcpNo: z.string(),
  checkedThrough: z.string().optional(),
  amendmentCount: z.number(),
  amendments: z.array(amendmentSchema),
  sourceName: z.string(),
  detectionFailed: z.boolean(),
  notes: z.array(z.string()),
});

export type WatchAmendment = z.infer<typeof amendmentSchema>;

export type WatchState = z.infer<typeof watchStateSchema>;

export const watchStateDir = (offerId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "public", WATCH_SECTION, assertOfferId(offerId));

export const watchFileName = (checkedAt: string): string =>
  `watch-${checkedAt.replace(/[:.]/g, "-")}.json`;

export const toWatchState = (
  event: AmendmentEvent,
  sourceName: string,
): WatchState => ({
  offerId: event.offerId,
  checkedAt: event.checkedAt,
  baseRcpNo: event.baseRcpNo ?? "",
  ...(event.checkedThrough === undefined
    ? {}
    : { checkedThrough: event.checkedThrough }),
  amendmentCount: event.amendments.length,
  amendments: event.amendments.map((amendment) => ({
    rcpNo: amendment.rcpNo,
    receivedOn: amendment.receivedOn,
    reportName: amendment.reportName,
  })),
  sourceName,
  detectionFailed: event.kind === "detection_failed",
  notes: [...event.notes],
});

export const parseWatchState = (raw: unknown): WatchState => {
  const parsed = watchStateSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`감시 기록 형식이 올바르지 않습니다 — ${reason}`);
  }
  return parsed.data;
};

export const writeWatchState = async (
  state: WatchState,
  dataDir = "data",
): Promise<string> => {
  if (!isPublicVerificationDocumentAllowed(state.offerId, state.baseRcpNo)) {
    throw new Error("공개 감시 기록은 승인된 active RCP만 저장할 수 있습니다.");
  }
  const dir = watchStateDir(state.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, watchFileName(state.checkedAt));
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return file;
};

export const loadLatestWatchState = async (
  offerId: string,
  dataDir = "data",
): Promise<WatchState | undefined> => {
  if (!isPublicVerificationScopeAllowed(offerId)) return undefined;
  const dir = watchStateDir(offerId, dataDir);

  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return undefined;
  }

  const fileName = files
    .filter((file) => WATCH_FILE_PATTERN.test(file))
    .sort()
    .at(-1);
  if (!fileName) return undefined;

  try {
    const state = parseWatchState(
      JSON.parse(await readFile(path.join(dir, fileName), "utf8")),
    );
    return state.offerId === offerId &&
      isPublicVerificationDocumentAllowed(offerId, state.baseRcpNo)
      ? state
      : undefined;
  } catch {
    return undefined;
  }
};
