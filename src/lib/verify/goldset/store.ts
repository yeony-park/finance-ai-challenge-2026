/**
 * 골드셋 파일 입출력.
 *
 * ⚠️ 골드셋에는 이력번호·사육지가 그대로 담긴다 — `data/raw`·`data/reports`와 같은
 * **로컬 전용** 구획이며 git에 올리지 않는다(.gitignore). 커밋 대상은 라벨 가이드뿐이다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertRcpNo, offerDataDir } from "../paths";
import { goldSetSchema, type GoldSet } from "./types";

export const goldsetDir = (offerId: string, dataDir = "data"): string =>
  offerDataDir("goldset", offerId, dataDir);

export const goldsetFile = (
  offerId: string,
  rcpNo: string,
  dataDir = "data",
): string =>
  path.join(goldsetDir(offerId, dataDir), `labels-${assertRcpNo(rcpNo)}.json`);

export const writeGoldSet = async (
  goldset: GoldSet,
  dataDir = "data",
): Promise<string> => {
  const file = goldsetFile(goldset.offerId, goldset.rcpNo, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(goldset, null, 2)}\n`, "utf8");
  return file;
};

/** 파일도 "외부에서 들어오는 JSON"이다 — 모양이 어긋나면 즉시 실패한다 */
export const readGoldSet = async (
  offerId: string,
  rcpNo: string,
  dataDir = "data",
): Promise<GoldSet> => {
  const file = goldsetFile(offerId, rcpNo, dataDir);
  const parsed = goldSetSchema.safeParse(
    JSON.parse(await readFile(file, "utf8")),
  );
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`골드셋 형식이 올바르지 않습니다 (${file}) — ${reason}`);
  }
  return parsed.data;
};
