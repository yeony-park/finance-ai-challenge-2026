import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { PathLike } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  commitStagedFiles,
  generateRealEstateScenarioDocuments,
  prepareRealEstateTransaction,
  recoverUnfinishedRealEstateTransaction,
} from "../../../../scripts/generate-real-estate-scenario-docs.mjs";

const projectRoot = path.resolve(import.meta.dirname, "../../../..");
const temporaryRoots: string[] = [];

const snapshot = async (root: string) => {
  const manifestPath = path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return Promise.all([
    readFile(path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.pdf")),
    readFile(manifestPath),
    readFile(path.join(root, "public/scenario-documents/re-scenario-01-product-description.pdf")),
    readFile(path.join(root, `data/knowledge/derived/real-estate/re-scenario-01/parsed-${manifest.sourceHash}.json`)),
    readFile(path.join(root, "data/knowledge/derived/real-estate/re-scenario-01/product.json")),
  ]).then((values) => values.map((value) => createHash("sha256").update(value).digest("hex")));
};

const fixtureRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "real-estate-generator-test-"));
  temporaryRoots.push(root);
  await Promise.all([
    cp(path.join(projectRoot, "data/scenarios/real-estate"), path.join(root, "data/scenarios/real-estate"), { recursive: true }),
    cp(path.join(projectRoot, "data/knowledge/inputs/real-estate"), path.join(root, "data/knowledge/inputs/real-estate"), { recursive: true }),
    cp(path.join(projectRoot, "data/knowledge/derived/real-estate"), path.join(root, "data/knowledge/derived/real-estate"), { recursive: true }),
    cp(path.join(projectRoot, "public/scenario-documents"), path.join(root, "public/scenario-documents"), { recursive: true }),
  ]);
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("real-estate PDF generator safety gates", () => {
  it.each([
    "api_key=fixture-only-value",
    "AKIA1234567890ABCDEF",
    "ASIA1234567890ABCDEF",
    `AIza${"a".repeat(35)}`,
    "ghp_123456789012345678901234567890123456",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlIn0.signature",
    "-----BEGIN PRIVATE KEY-----",
  ])("malicious seed %s is rejected before canonical input/public/manifest/parsed/product writes", async (maliciousValue) => {
    const root = await fixtureRoot();
    const before = await snapshot(root);
    const seedPath = path.join(root, "data/scenarios/real-estate/re-scenario-01.json");
    const seed = JSON.parse(await readFile(seedPath, "utf8"));
    seed.assumptions[0] = maliciousValue;
    await writeFile(seedPath, `${JSON.stringify(seed)}\n`, "utf8");

    await expect(generateRealEstateScenarioDocuments({ workspaceRoot: root })).rejects.toThrow("credential 문맥");
    await expect(snapshot(root)).resolves.toEqual(before);
  });

  it("prior product mismatch is rejected before canonical writes", async () => {
    const root = await fixtureRoot();
    const productPath = path.join(root, "data/knowledge/derived/real-estate/re-scenario-01/product.json");
    const envelope = JSON.parse(await readFile(productPath, "utf8"));
    envelope.product.title = "불일치 검사용 제목";
    await writeFile(productPath, `${JSON.stringify(envelope)}\n`, "utf8");
    const before = await snapshot(root);

    await expect(generateRealEstateScenarioDocuments({ workspaceRoot: root })).rejects.toThrow("기존 승인·hash·seed product 결속");
    await expect(snapshot(root)).resolves.toEqual(before);
  });

  it("prior manifest rights and limitations changes are rejected before canonical writes", async () => {
    const root = await fixtureRoot();
    const manifestPath = path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.rightsStatus = "licensed";
    manifest.limitations = [...manifest.limitations, "변조 검사용 limitation"];
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    const before = await snapshot(root);

    await expect(generateRealEstateScenarioDocuments({ workspaceRoot: root })).rejects.toThrow("기존 승인·hash·seed product 결속");
    await expect(snapshot(root)).resolves.toEqual(before);
  });

  it("commit rename failure restores prior canonical files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "real-estate-commit-test-"));
    temporaryRoots.push(root);
    const stage = path.join(root, ".real-estate-pdf-transaction");
    const first = path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.pdf");
    const second = path.join(root, "public/scenario-documents/re-scenario-01-product-description.pdf");
    const stagedFirst = path.join(stage, "next/input/re-offer-01/re-scenario-01-product-description.pdf");
    const stagedSecond = path.join(stage, "next/public/re-scenario-01-product-description.pdf");
    await Promise.all([mkdir(path.dirname(first), { recursive: true }), mkdir(path.dirname(second), { recursive: true }), mkdir(path.dirname(stagedFirst), { recursive: true }), mkdir(path.dirname(stagedSecond), { recursive: true })]);
    await Promise.all([
      writeFile(first, "old-first"), writeFile(second, "old-second"),
      writeFile(stagedFirst, "new-first"), writeFile(stagedSecond, "new-second"),
    ]);

    const journal = await prepareRealEstateTransaction({
      workspaceRoot: root,
      files: [{ stageFile: stagedFirst, target: first }, { stageFile: stagedSecond, target: second }],
      obsoleteFiles: [],
    });
    const events: string[] = [];
    const name = (value: PathLike) => path.relative(root, String(value)) || ".";
    const syncDirectoryFn = async (directory: string) => { events.push(`sync:${name(directory)}`); };
    await expect(commitStagedFiles({
      workspaceRoot: root,
      journal,
      renameFile: async (source: PathLike, target: PathLike) => {
        events.push(`rename:${name(source)}>${name(target)}`);
        if (source === stagedSecond) throw new Error("injected rename failure");
        await rename(source, target);
      },
      syncDirectoryFn,
    })).rejects.toThrow("injected rename failure");
    await expect(readFile(first, "utf8")).resolves.toBe("old-first");
    await expect(readFile(second, "utf8")).resolves.toBe("old-second");
    const rollback = `rename:${name(first)}>${name(path.join(stage, "rollback/0"))}`;
    const restore = `rename:${name(path.join(stage, "backup/0"))}>${name(first)}`;
    expect(events.indexOf(rollback)).toBeGreaterThan(events.indexOf(`rename:${name(stagedFirst)}>${name(first)}`));
    expect(events.indexOf(restore)).toBeGreaterThan(events.indexOf(rollback));
    expect(events.lastIndexOf(`sync:${name(path.dirname(first))}`)).toBeGreaterThan(events.indexOf(restore));
  });

  it("fsyncs the workspace after journal mkdir and both parents after each rename", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "real-estate-fsync-test-"));
    temporaryRoots.push(root);
    const stage = path.join(root, ".real-estate-pdf-transaction");
    const target = path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.pdf");
    const staged = path.join(stage, "next/input/re-offer-01/re-scenario-01-product-description.pdf");
    await Promise.all([mkdir(path.dirname(target), { recursive: true }), mkdir(path.dirname(staged), { recursive: true })]);
    await Promise.all([writeFile(target, "old-pdf"), writeFile(staged, "new-pdf")]);
    const events: string[] = [];
    const name = (value: string) => path.relative(root, value) || ".";
    const syncDirectoryFn = async (directory: string) => { events.push(`sync:${name(directory)}`); };
    const renameFile = async (source: PathLike, targetPath: PathLike) => { events.push(`rename:${name(String(source))}>${name(String(targetPath))}`); await rename(source, targetPath); };
    const journal = await prepareRealEstateTransaction({ workspaceRoot: root, files: [{ stageFile: staged, target }], obsoleteFiles: [], syncDirectoryFn });
    await commitStagedFiles({ workspaceRoot: root, journal, renameFile, syncDirectoryFn });

    const backup = path.join(stage, "backup/0");
    expect(events).toEqual(expect.arrayContaining([
      "sync:.",
      `rename:${name(target)}>${name(backup)}`,
      `sync:${name(path.dirname(target))}`,
      `sync:${name(path.dirname(backup))}`,
      `rename:${name(staged)}>${name(target)}`,
      `sync:${name(path.dirname(staged))}`,
      `sync:${name(path.dirname(target))}`,
    ]));
    expect(events.indexOf(`rename:${name(target)}>${name(backup)}`)).toBeLessThan(events.indexOf(`sync:${name(path.dirname(backup))}`));
    expect(events.indexOf(`rename:${name(staged)}>${name(target)}`)).toBeLessThan(events.lastIndexOf(`sync:${name(path.dirname(target))}`));
  });

  it("unfinished journal restores a backup made before a simulated crash", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "real-estate-recovery-test-"));
    temporaryRoots.push(root);
    const stage = path.join(root, ".real-estate-pdf-transaction");
    const target = path.join(root, "data/knowledge/inputs/real-estate/re-offer-01/re-scenario-01-product-description.pdf");
    const staged = path.join(stage, "next/input/re-offer-01/re-scenario-01-product-description.pdf");
    await Promise.all([mkdir(path.dirname(target), { recursive: true }), mkdir(path.dirname(staged), { recursive: true })]);
    await Promise.all([writeFile(target, "old-pdf"), writeFile(staged, "new-pdf")]);
    const journal = await prepareRealEstateTransaction({ workspaceRoot: root, files: [{ stageFile: staged, target }], obsoleteFiles: [] });
    await mkdir(path.dirname(journal.entries[0].backup), { recursive: true });
    await rename(target, journal.entries[0].backup);

    const events: string[] = [];
    const name = (value: PathLike) => path.relative(root, String(value)) || ".";
    const renameFile = async (source: PathLike, targetPath: PathLike) => { events.push(`rename:${name(source)}>${name(targetPath)}`); await rename(source, targetPath); };
    const syncDirectoryFn = async (directory: string) => {
      events.push(`sync:${name(directory)}`);
      if (path.resolve(directory) === root) events.push(`journal:${await access(stage).then(() => "present").catch(() => "removed")}`);
    };
    await expect(recoverUnfinishedRealEstateTransaction({ workspaceRoot: root, renameFile, syncDirectoryFn })).resolves.toBe(true);
    await expect(readFile(target, "utf8")).resolves.toBe("old-pdf");
    await expect(access(stage)).rejects.toMatchObject({ code: "ENOENT" });
    const restore = `rename:${name(journal.entries[0].backup)}>${name(target)}`;
    expect(events.indexOf(`sync:${name(path.dirname(target))}`)).toBeGreaterThan(events.indexOf(restore));
    expect(events.at(-1)).toBe("journal:removed");
  });
});
