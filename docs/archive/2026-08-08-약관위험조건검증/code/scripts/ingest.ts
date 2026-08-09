/**
 * 코퍼스 ingest — data/raw/*.txt(메타 헤더 + 본문)를 파싱해
 * src/lib/analysis/corpus/generated.ts 로 직렬화한다.
 *
 * 원본 형식:
 *   키: 값        ← 빈 줄 전까지 메타
 *   (빈 줄)
 *   본문 텍스트…
 *
 * 실데이터 교체 시에도 동일 형식(PDF → 텍스트 추출 후 헤더 부착)을 유지한다.
 * 수집 수칙(stream8): 자동 수집 시 robots 스냅숏·수집 로그를 data/raw/ 옆에 보존할 것.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface RawMeta {
  readonly [key: string]: string;
}

const RAW_DIR = join(process.cwd(), "data", "raw");
const OUT_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "analysis",
  "corpus",
  "generated.ts",
);

const ARTICLE_HEAD = /제\s*\d+\s*조(?:의\s*\d+)?\s*\(/g;

const parseRawFile = (
  fileName: string,
): { meta: RawMeta; body: string } => {
  const raw = readFileSync(join(RAW_DIR, fileName), "utf-8");
  const lines = raw.split("\n");
  const meta: Record<string, string> = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      bodyStart = i + 1;
      break;
    }
    const sep = line.indexOf(":");
    if (sep < 0) {
      throw new Error(`${fileName}: 메타 형식 오류 — "${line}"`);
    }
    meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  if (!body) throw new Error(`${fileName}: 본문이 비어 있음`);
  return { meta, body };
};

const requireKeys = (
  fileName: string,
  meta: RawMeta,
  keys: readonly string[],
): void => {
  for (const key of keys) {
    if (!meta[key]) throw new Error(`${fileName}: 메타 "${key}" 누락`);
  }
};

const run = (): void => {
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".txt"));
  const products: object[] = [];
  const standards: object[] = [];

  for (const file of files.sort()) {
    const { meta, body } = parseRawFile(file);
    const articleCount = (body.match(ARTICLE_HEAD) ?? []).length;

    if (meta.type === "standard") {
      requireKeys(file, meta, ["id", "title", "sourceUrl"]);
      standards.push({
        id: meta.id,
        title: meta.title,
        sourceUrl: meta.sourceUrl,
        rawText: body,
      });
    } else if (meta.type === "product") {
      requireKeys(file, meta, [
        "productId",
        "insurer",
        "productName",
        "category",
        "sourceUrl",
        "effectiveDate",
        "standardRef",
      ]);
      products.push({
        productId: meta.productId,
        insurer: meta.insurer,
        productName: meta.productName,
        category: meta.category,
        sourceUrl: meta.sourceUrl,
        effectiveDate: meta.effectiveDate,
        standardRef: meta.standardRef,
        demo: meta.demo === "true",
        rawText: body,
      });
    } else {
      throw new Error(`${file}: type은 standard|product 여야 함`);
    }

    console.log(`✔ ${file} — 조항 ${articleCount}개 인식`);
  }

  const banner = [
    "/**",
    " * ⚠️ 자동 생성 파일 — 직접 수정 금지. `npm run ingest`가 data/raw/에서 생성한다.",
    " */",
    'import type { AnalysisCorpus } from "../types";',
    "",
  ].join("\n");

  const payload = JSON.stringify({ products, standards }, null, 2);
  writeFileSync(
    OUT_PATH,
    `${banner}export const ANALYSIS_CORPUS: AnalysisCorpus = ${payload};\n`,
  );
  console.log(
    `\n생성 완료: ${OUT_PATH}\n상품 ${products.length}건 · 표준약관 ${standards.length}건`,
  );
};

run();
