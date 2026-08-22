#!/usr/bin/env node
/** Remove .env* entries from a Next standalone bundle without opening their contents. */
import { lstat, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const standaloneRoot = fileURLToPath(new URL("../.next/standalone/", import.meta.url));

async function envArtifacts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.name.startsWith(".env")) {
      found.push(path);
      continue;
    }
    // Do not follow symlinks outside the bundle.
    if (entry.isDirectory() && !(await lstat(path)).isSymbolicLink()) found.push(...await envArtifacts(path));
  }
  return found;
}

async function main() {
  try {
    await lstat(standaloneRoot);
  } catch {
    if (process.argv.includes("--check")) throw new Error("Next standalone output is missing");
    return;
  }
  const found = await envArtifacts(standaloneRoot);
  if (!process.argv.includes("--check")) await Promise.all(found.map((path) => rm(path, { recursive: true, force: true })));
  const remaining = await envArtifacts(standaloneRoot);
  if (remaining.length) throw new Error("Next standalone output contains forbidden .env artifacts");
}

await main();
