import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test("runtime repository imports the synthetic fixture", () => {
  const repository = read("lib/repositories/art-repositories.ts");
  assert.match(repository, /from ["']@\/data\/synthetic\/art-investment\.json["']/);
  assert.match(repository, /export const dataMode = "synthetic"/);
});

test("deployable TypeScript runtime has no retired adapter or raw-data imports", () => {
  const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]
    .filter((path) => !path.endsWith("lib/art/legacy-adapter.ts"));
  const imports = files.flatMap((path) => {
    const source = read(path);
    return [...source.matchAll(/(?:from|import\s*\()[\s]*(?:["'])([^"']+)(?:["'])/g)].map((match) => `${path}: ${match[1]}`);
  });
  assert.ok(imports.some((item) => item.includes("@/data/synthetic/art-investment.json")));
  assert.equal(imports.some((item) => item.includes("legacy-adapter")), false);
  assert.equal(imports.some((item) => /(?:^|[/])data[/](?!synthetic[/])/.test(item) && !item.includes("dart-filing-manifest")), false);
  assert.equal(imports.some((item) => /(?:^|[/])(?:products|issuers)\.json/.test(item)), false);
});

