#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "reference", "pig-asf");
const RAW_DIR = path.join(OUT_DIR, "raw");
const BOARD_URL =
  "https://www.mafra.go.kr/FMD-AI2/2145/subview.do";
const LIST_URL =
  "https://www.mafra.go.kr/bbs/FMD-AI2/404/artclList.do?page=1&row=100";
const MAP_DATA_URL =
  "https://www.mafra.go.kr/FMD-AI2/map/ASF/ASF_data.js?v=2.4";
const ORIGIN = "https://www.mafra.go.kr";
const USER_AGENT =
  "finance-ai-challenge-2026/1.0 (competition data collection; official MAFRA source)";

const xmlParser = new XMLParser({ ignoreAttributes: false });

const decodeHtml = (value) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const stripHtml = (value) =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const fetchBuffer = async (url, attempt = 1) => {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) {
    if (attempt < 4 && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      return fetchBuffer(url, attempt + 1);
    }
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

const fetchText = async (url) => (await fetchBuffer(url)).toString("utf8");

const parseArticles = (html) => {
  const articles = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const link = row.match(
      /href="(\/bbs\/FMD-AI2\/404\/(\d+)\/artclView\.do)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    const publishedAt = row.match(
      /<td[^>]*class="tbl_date"[^>]*>\s*([\d.]+)\s*<\/td>/i,
    );
    if (!link || !publishedAt) continue;
    articles.push({
      articleId: link[2],
      title: stripHtml(link[3]),
      publishedAt: publishedAt[1].replaceAll(".", "-").replace(/-$/, ""),
      sourceUrl: new URL(link[1], ORIGIN).toString(),
    });
  }
  return articles;
};

const parseAttachments = (html) => {
  const attachments = [];
  for (const match of html.matchAll(
    /<a[^>]*href="([^"?]+\/download\.do(?:\?[^\"]*)?)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    // MAFRA markup nests the preview anchor inside the download anchor.
    // Only text before the file-size span is the actual attachment name.
    const fileName = stripHtml(match[2].split(/<(?:span|a)\b/i)[0]);
    if (!fileName) continue;
    attachments.push({
      attachmentId:
        match[1].match(/\/(\d+)\/download\.do/)?.[1] ?? sha256(match[1]).slice(0, 12),
      fileName,
      downloadUrl: new URL(decodeHtml(match[1]), ORIGIN).toString(),
    });
  }
  return attachments;
};

const safeFileName = (value) =>
  value
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

const collectText = (node) => {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node !== "object") return "";
  return Object.entries(node)
    .filter(
      ([key]) =>
        !key.startsWith("@_") &&
        key !== "hp:linesegarray" &&
        key !== "hp:cellAddr" &&
        key !== "hp:cellSpan" &&
        key !== "hp:cellSz" &&
        key !== "hp:cellMargin",
    )
    .map(([, value]) => collectText(value))
    .join("");
};

const findNodes = (node, key, found = []) => {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const child of node) findNodes(child, key, found);
    return found;
  }
  for (const [childKey, value] of Object.entries(node)) {
    if (childKey === key) {
      found.push(...(Array.isArray(value) ? value : [value]));
    } else {
      findNodes(value, key, found);
    }
  }
  return found;
};

const rowsFromHwpx = (buffer) => {
  const archive = unzipSync(buffer);
  const sectionNames = Object.keys(archive)
    .filter((name) => /^Contents\/section\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const rows = [];
  for (const sectionName of sectionNames) {
    const document = xmlParser.parse(strFromU8(archive[sectionName]));
    for (const table of findNodes(document, "hp:tbl")) {
      const tableRows = table["hp:tr"];
      for (const row of Array.isArray(tableRows) ? tableRows : [tableRows]) {
        if (!row) continue;
        const cells = Array.isArray(row["hp:tc"])
          ? row["hp:tc"]
          : [row["hp:tc"]];
        const values = cells
          .filter(Boolean)
          .map((cell) => collectText(cell).replace(/\s+/g, " ").trim());
        if (values.some(Boolean)) rows.push(values);
      }
    }
  }
  return rows;
};

const rowsFromPlainText = (text) => {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const brackets = [...line.matchAll(/<([^>]*)>/g)].map((match) =>
      match[1].trim(),
    );
    if (brackets.length >= 3) {
      rows.push(brackets);
      continue;
    }
    const tabs = line.split("\t").map((cell) => cell.trim()).filter(Boolean);
    if (tabs.length >= 3) rows.push(tabs);
  }
  return rows;
};

const rowsFromHwp = async (filePath) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mafra-asf-hwp-"));
  try {
    const result = spawnSync(
      "soffice",
      ["--headless", "--convert-to", "txt:Text", "--outdir", tempDir, filePath],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || "LibreOffice HWP 변환 실패");
    }
    const textPath = path.join(
      tempDir,
      `${path.basename(filePath, path.extname(filePath))}.txt`,
    );
    return rowsFromPlainText(await readFile(textPath, "utf8"));
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

const PROVINCE_ALIASES = new Map([
  ["서울", "서울"],
  ["서울특별시", "서울"],
  ["부산", "부산"],
  ["부산광역시", "부산"],
  ["대구", "대구"],
  ["대구광역시", "대구"],
  ["인천", "인천"],
  ["인천광역시", "인천"],
  ["광주", "광주"],
  ["광주광역시", "광주"],
  ["대전", "대전"],
  ["대전광역시", "대전"],
  ["울산", "울산"],
  ["울산광역시", "울산"],
  ["세종", "세종"],
  ["세종특별자치시", "세종"],
  ["경기", "경기"],
  ["경기도", "경기"],
  ["강원", "강원"],
  ["강원도", "강원"],
  ["강원특별자치도", "강원"],
  ["충북", "충북"],
  ["충청북도", "충북"],
  ["충남", "충남"],
  ["충청남도", "충남"],
  ["전북", "전북"],
  ["전라북도", "전북"],
  ["전북특별자치도", "전북"],
  ["전남", "전남"],
  ["전라남도", "전남"],
  ["경북", "경북"],
  ["경상북도", "경북"],
  ["경남", "경남"],
  ["경상남도", "경남"],
  ["제주", "제주"],
  ["제주특별자치도", "제주"],
]);

const parseRegion = (value) => {
  const cleaned = value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter(Boolean);
  const province = PROVINCE_ALIASES.get(parts[0]);
  if (parts.length < 2 || !province) return null;
  return {
    province,
    cityCounty: parts[1],
    region: `${province} ${parts[1]}`,
  };
};

const parseOccurredAt = (value, fallbackYear) => {
  const cleaned = value
    .replace(/[‘’'`]/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const joinedYear = cleaned.match(/^(\d{2})(\d{1,2})\.(\d{1,2})\.?$/);
  if (joinedYear) {
    const year = 2000 + Number(joinedYear[1]);
    const month = Number(joinedYear[2]);
    const day = Number(joinedYear[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const match = cleaned.match(/(?:(\d{2,4})\s*[.\-/년])?(\d{1,2})\s*[.\-/월](\d{1,2})/);
  if (!match) return null;
  const yearValue = match[1] ? Number(match[1]) : fallbackYear;
  const year = yearValue < 100 ? 2000 + yearValue : yearValue;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const parseHeadCount = (value) => {
  const match = value.match(/([\d,]+)\s*두/) ?? value.match(/^\s*([\d,]+)\s*$/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
};

const parseMapPoints = (buffer) => {
  const script = new TextDecoder("euc-kr").decode(buffer);
  const block = script.match(/var\s+jsnewList2\s*=\s*(\[[\s\S]*?\])\s*;/)?.[1];
  if (!block) throw new Error("ASF_data.js에서 농장 발생 좌표 배열을 찾지 못했습니다.");
  const rows = JSON.parse(block.replace(/,\s*]/g, "]"));
  return rows.map((row) => ({
    sourceSequence: Number(row[0]),
    region: row[1],
    occurredAt: row[2].replaceAll(".", "-").replace(/-$/, ""),
    latitude: Number(row[4]),
    longitude: Number(row[5]),
  }));
};

const cityKey = (value) => value.replace(/(?:특례시|시|군|구)$/u, "");

const dayDifference = (left, right) =>
  Math.round(
    (Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) /
      86_400_000,
  );

const attachOfficialCoordinates = (events, points) => {
  const unused = new Set(points.map((point) => point.sourceSequence));
  const comparisons = [];
  const enriched = events.map((event) => {
    const candidates = points
      .filter((point) => unused.has(point.sourceSequence))
      .map((point) => ({ point, location: parseRegion(point.region) }))
      .filter(
        ({ location }) =>
          location && cityKey(location.cityCounty) === cityKey(event.cityCounty),
      )
      .sort((left, right) => {
        const leftProvince = left.location.province === event.province ? 0 : 1;
        const rightProvince = right.location.province === event.province ? 0 : 1;
        if (leftProvince !== rightProvince) return leftProvince - rightProvince;
        const leftDays = Math.abs(dayDifference(left.point.occurredAt, event.occurredAt));
        const rightDays = Math.abs(dayDifference(right.point.occurredAt, event.occurredAt));
        return leftDays - rightDays;
      });
    const matched = candidates[0];
    if (!matched) throw new Error(`공식 지도 좌표 미대응: ${event.id} ${event.region}`);
    unused.delete(matched.point.sourceSequence);
    const dateDifferenceDays = dayDifference(
      matched.point.occurredAt,
      event.occurredAt,
    );
    comparisons.push({
      eventId: event.id,
      dateDifferenceDays,
      provinceMatched: matched.location.province === event.province,
    });
    return {
      ...event,
      coordinates: {
        latitude: matched.point.latitude,
        longitude: matched.point.longitude,
        precision: "농림축산식품부 공개 지도 행정기관 기준점",
        sourceUrl: MAP_DATA_URL,
        sourceSequence: matched.point.sourceSequence,
      },
    };
  });
  if (unused.size > 0) {
    throw new Error(`공식 지도 좌표 ${unused.size}건이 표 행과 대응되지 않았습니다.`);
  }
  return { enriched, comparisons };
};

const parseEventRow = (cells, article, attachment) => {
  if (cells.length < 4 || !/^\d+$/.test(cells[0].trim())) return null;
  const sourceSequence = Number(cells[0].trim());
  const fallbackYear = Number(article.publishedAt.slice(0, 4));
  let regionValue;
  let occurredAtValue;
  let headCountValue;

  if (parseRegion(cells[1])) {
    regionValue = cells[1];
    occurredAtValue = cells[2];
    headCountValue = cells[3];
  } else if (parseRegion(cells[3])) {
    occurredAtValue = cells[1];
    headCountValue = cells[2];
    regionValue = cells[3];
  } else {
    return null;
  }

  const location = parseRegion(regionValue);
  const occurredAt = parseOccurredAt(occurredAtValue, fallbackYear);
  if (!location || !occurredAt) return null;
  const year = Number(occurredAt.slice(0, 4));
  if (year < 2019 || year > 2026) return null;

  return {
    id: `${year === 2026 ? "2026" : "2019-2025"}-${sourceSequence}`,
    occurredAt,
    sourceSequence,
    raisedHeadCount: parseHeadCount(headCountValue),
    ...location,
    source: {
      articleId: article.articleId,
      articleTitle: article.title,
      publishedAt: article.publishedAt,
      sourceUrl: article.sourceUrl,
      attachmentId: attachment.attachmentId,
      attachmentFileName: attachment.fileName,
    },
  };
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  await mkdir(RAW_DIR, { recursive: true });
  const collectedAt = new Date().toISOString();
  const articles = parseArticles(await fetchText(LIST_URL));
  if (articles.length !== 86) {
    throw new Error(`게시물 86건을 예상했지만 ${articles.length}건을 찾았습니다.`);
  }

  const documents = [];
  const eventVersions = new Map();
  const existingRawNames = new Set(await readdir(RAW_DIR));
  let attachmentCount = 0;

  for (const [articleIndex, article] of articles.entries()) {
    const detailHtml = await fetchText(article.sourceUrl);
    const attachments = parseAttachments(detailHtml);
    const documentAttachments = [];

    for (const attachment of attachments) {
      attachmentCount += 1;
      const localName = `${article.articleId}-${attachment.attachmentId}-${safeFileName(attachment.fileName)}`;
      const filePath = path.join(RAW_DIR, localName);
      const legacyName = [...existingRawNames].find((name) =>
        name.startsWith(`${article.articleId}-${attachment.attachmentId}-`),
      );
      if (!(await fileExists(filePath)) && legacyName) {
        await rename(path.join(RAW_DIR, legacyName), filePath);
        existingRawNames.delete(legacyName);
        existingRawNames.add(localName);
      }
      let buffer;
      if (await fileExists(filePath)) {
        buffer = await readFile(filePath);
      } else {
        buffer = await fetchBuffer(attachment.downloadUrl);
        await writeFile(filePath, buffer);
      }

      const extension = path.extname(attachment.fileName).toLowerCase();
      let rows = [];
      let parseStatus = "unsupported";
      let parseError = null;
      try {
        if (extension === ".hwpx") {
          rows = rowsFromHwpx(buffer);
          parseStatus = "parsed";
        } else if (extension === ".hwp") {
          rows = await rowsFromHwp(filePath);
          parseStatus = "parsed";
        }
      } catch (error) {
        parseStatus = "failed";
        parseError = error instanceof Error ? error.message : String(error);
      }

      let parsedEventCount = 0;
      for (const row of rows) {
        const event = parseEventRow(row, article, attachment);
        if (!event) continue;
        parsedEventCount += 1;
        const current = eventVersions.get(event.id);
        if (!current || current.source.publishedAt <= event.source.publishedAt) {
          eventVersions.set(event.id, event);
        }
      }

      documentAttachments.push({
        attachmentId: attachment.attachmentId,
        fileName: attachment.fileName,
        downloadUrl: attachment.downloadUrl,
        localPath: path.relative(ROOT, filePath).split(path.sep).join("/"),
        mediaType:
          extension === ".hwpx"
            ? "application/hwp+zip"
            : extension === ".hwp"
              ? "application/x-hwp"
              : "application/octet-stream",
        bytes: buffer.length,
        sha256: sha256(buffer),
        parseStatus,
        parseError,
        parsedRowCount: rows.length,
        parsedEventCount,
      });
    }

    documents.push({ ...article, attachments: documentAttachments });
    process.stdout.write(
      `\r게시물 ${articleIndex + 1}/${articles.length} · 첨부 ${attachmentCount}건`,
    );
  }
  process.stdout.write("\n");

  let events = [...eventVersions.values()].sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  );
  const mapDataBuffer = await fetchBuffer(MAP_DATA_URL);
  const mapDataPath = path.join(RAW_DIR, "mafra_asf_map_data.js");
  await writeFile(mapDataPath, mapDataBuffer);
  const mapPoints = parseMapPoints(mapDataBuffer);
  const coordinateResult = attachOfficialCoordinates(events, mapPoints);
  events = coordinateResult.enriched;
  const coordinateComparisons = coordinateResult.comparisons;
  const yearlyCounts = Object.fromEntries(
    [...new Set(events.map((event) => event.occurredAt.slice(0, 4)))]
      .sort()
      .map((year) => [
        year,
        events.filter((event) => event.occurredAt.startsWith(year)).length,
      ]),
  );
  const expectedYearlyCounts = {
    "2019": 14,
    "2020": 2,
    "2021": 5,
    "2022": 7,
    "2023": 10,
    "2024": 11,
    "2025": 6,
    "2026": 24,
  };
  const yearlyCountsMatch =
    JSON.stringify(yearlyCounts) === JSON.stringify(expectedYearlyCounts);

  const data = {
    schemaVersion: 1,
    asOf: events.at(-1)?.occurredAt ?? null,
    source: {
      name: "농림축산식품부 가축전염병(ASF) 발생현황 정보공개",
      boardUrl: BOARD_URL,
      collectedAt,
      processing:
        "공식 첨부 표에서 발생일·시도·시군구·사육두수만 정규화. 농장명·농장주·상세주소는 포함하지 않음.",
    },
    coverage: {
      eventCount: events.length,
      firstOccurredAt: events.at(0)?.occurredAt ?? null,
      lastOccurredAt: events.at(-1)?.occurredAt ?? null,
      yearlyCounts,
    },
    validation: {
      expectedYearlyCounts,
      yearlyCountsMatch,
      expectedEventCount: 79,
      eventCountMatches: events.length === 79,
      note:
        "2026-03-20 원문 요약의 '총 75건'은 같은 문서의 연도별 수치 합계 및 표 행수 79건과 불일치하므로 표 행을 기준으로 함.",
      normalizations: [
        "2025-12-30 누적표의 ‘246.15.’는 연도별 구간과 순서에 따라 2024-06-15로 구분점을 복원함.",
        "시도 정식명칭(경기도·강원도 등)은 화면용 약칭으로 통일함.",
      ],
      coordinateComparison: {
        sourceUrl: MAP_DATA_URL,
        pointCount: mapPoints.length,
        matchedCount: coordinateComparisons.length,
        exactDateCount: coordinateComparisons.filter(
          (comparison) => comparison.dateDifferenceDays === 0,
        ).length,
        oneDayAfterCount: coordinateComparisons.filter(
          (comparison) => comparison.dateDifferenceDays === 1,
        ).length,
        otherDateCount: coordinateComparisons.filter(
          (comparison) => ![0, 1].includes(comparison.dateDifferenceDays),
        ).length,
        provinceMismatchCount: coordinateComparisons.filter(
          (comparison) => !comparison.provinceMatched,
        ).length,
        policy:
          "발생일·행정구역은 첨부 표를 정본으로 유지하고, 지도 파일에서는 좌표만 결합함.",
      },
    },
    events,
  };
  const index = {
    schemaVersion: 1,
    source: { boardUrl: BOARD_URL, listUrl: LIST_URL, collectedAt },
    postCount: documents.length,
    attachmentCount,
    mapData: {
      sourceUrl: MAP_DATA_URL,
      localPath: path.relative(ROOT, mapDataPath).split(path.sep).join("/"),
      bytes: mapDataBuffer.length,
      sha256: sha256(mapDataBuffer),
      pointCount: mapPoints.length,
    },
    documents,
  };

  if (
    !yearlyCountsMatch ||
    events.length !== 79 ||
    mapPoints.length !== 79 ||
    coordinateComparisons.length !== 79
  ) {
    throw new Error(
      `정규화 검증 실패: ${events.length}건 · ${JSON.stringify(yearlyCounts)}`,
    );
  }

  await writeFile(
    path.join(OUT_DIR, "mafra_asf_events.json"),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(OUT_DIR, "mafra_asf_documents.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `완료: 게시물 ${documents.length}건 · 첨부 ${attachmentCount}건 · 국내 ASF ${events.length}건`,
  );
};

main().catch((error) => {
  console.error("MAFRA ASF 수집 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
