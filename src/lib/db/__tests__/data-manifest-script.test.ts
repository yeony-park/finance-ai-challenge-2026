import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  assertNoUnstagedPublicChanges,
  assertPublicFilesTracked,
  listTrackedPublicFiles,
  main,
} from "../../../../scripts/update-data-manifest.mjs";

describe("data manifest 공개 파일 Git 승인 경계", () => {
  test("tracked와 staged 파일만 승인 목록으로 사용한다", async () => {
    const runGit = vi.fn(async () =>
      ["data/public/tracked.json", "data/offers/staged.json", ""].join("\0"),
    );
    const tracked = await listTrackedPublicFiles("/repo", runGit);

    expect(runGit).toHaveBeenCalledWith(
      [
        "ls-files",
        "--cached",
        "-z",
        "--",
        "data/public",
        "data/reference",
        "data/offers",
        "data/synthetic",
      ],
      "/repo",
    );
    expect(tracked).toEqual(
      new Set(["data/public/tracked.json", "data/offers/staged.json"]),
    );
  });

  test("스캔 루트의 순수 untracked 파일은 manifest 생성 전에 거부한다", () => {
    const root = path.resolve("/repo");
    const tracked = new Set(["data/public/tracked.json"]);

    expect(() =>
      assertPublicFilesTracked(
        [
          path.join(root, "data/public/tracked.json"),
          path.join(root, "data/reference/untracked.json"),
        ],
        tracked,
        root,
      ),
    ).toThrow("Git 미추적 파일");
  });

  test("tracked 파일의 unstaged drift는 manifest를 쓰기 전에 거부한다", async () => {
    const runGit = vi.fn(async () => "data/public/tracked.json\0");
    const writeManifest = vi.fn();

    await expect(main({ runGit, writeManifest })).rejects.toThrow(
      "index 대비 unstaged 변경",
    );
    expect(writeManifest).not.toHaveBeenCalled();
  });

  test("staged 변경과 동일한 worktree는 unstaged drift가 아니므로 허용한다", async () => {
    const runGit = vi.fn(async () => "");

    await expect(
      assertNoUnstagedPublicChanges("/repo", runGit),
    ).resolves.toBeUndefined();
    expect(runGit).toHaveBeenCalledWith(
      [
        "diff",
        "--no-ext-diff",
        "--name-only",
        "-z",
        "--",
        "data/public",
        "data/reference",
        "data/offers",
        "data/synthetic",
      ],
      "/repo",
    );
  });
});
