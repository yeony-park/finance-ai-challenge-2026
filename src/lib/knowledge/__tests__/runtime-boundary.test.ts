import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = path.join(process.cwd(), "src");
const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
const forbidden = [
  "@napi-rs/canvas",
  "@ai-sdk/openai",
  "vision-ocr",
  "ocr-render-isolation",
  "pdf-isolation",
];

const resolveSourceImport = async (from: string, specifier: string): Promise<string | null> => {
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (await stat(candidate).then((value) => value.isFile()).catch(() => false)) return candidate;
  }
  return null;
};

const runtimeImportsOf = async (entries: readonly string[]) => {
  const pending = entries.map((entry) => path.join(process.cwd(), entry));
  const seen = new Set<string>();
  const imports: { readonly from: string; readonly specifier: string }[] = [];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1]!;
      imports.push({ from: path.relative(process.cwd(), file), specifier });
      const resolved = await resolveSourceImport(file, specifier);
      if (resolved) pending.push(resolved);
    }
  }
  return imports;
};

describe("derived registry runtime module boundary", () => {
  it("상품 페이지·loader·DB ingest graph는 CLI AI/OCR/native canvas를 가져오지 않는다", async () => {
    const imports = await runtimeImportsOf([
      "src/app/real-estate/page.tsx",
      "src/app/offers/[id]/page.tsx",
      "src/lib/knowledge/loader.ts",
      "src/lib/db/ingest/knowledge.ts",
    ]);
    const violations = imports.filter(({ specifier }) =>
      specifier === "ai" || forbidden.some((name) => specifier === name || specifier.includes(name)));
    expect(violations).toEqual([]);

    const loader = await readFile(path.join(sourceRoot, "lib/knowledge/loader.ts"), "utf8");
    expect(loader).toContain('from "./derived-records"');
    expect(loader).not.toContain('from "./derived"');
  });
});
