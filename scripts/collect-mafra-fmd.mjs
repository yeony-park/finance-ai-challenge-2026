#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import CFB from "cfb";
import { strFromU8, unzipSync } from "fflate";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "reference", "livestock-disease", "fmd");
const RAW_DIR = path.join(ROOT, "data", "raw", "mafra-fmd");
const BOARD_URL = "https://www.mafra.go.kr/FMD-AI2/2216/subview.do";
const LIST_URL =
  "https://www.mafra.go.kr/bbs/FMD-AI2/389/artclList.do?page=1&row=100";
const MAP_DATA_URL =
  "https://www.mafra.go.kr/FMD-AI2/map/FMD/FMD_data.js?v=6";
const ORIGIN = "https://www.mafra.go.kr";
const USER_AGENT =
  "finance-ai-challenge-2026/1.0 (competition data collection; official MAFRA source)";

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

const fetchBuffer = async (url) => {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
};

const fetchText = async (url) => (await fetchBuffer(url)).toString("utf8");

const parseArticles = (html) => {
  const articles = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const link = row.match(
      /href="(\/bbs\/FMD-AI2\/389\/(\d+)\/artclView\.do)"[^>]*>([\s\S]*?)<\/a>/i,
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

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const textFromHwpx = (buffer) => {
  const archive = unzipSync(buffer);
  const preview = archive["Preview/PrvText.txt"];
  if (!preview) throw new Error("HWPX 미리보기 텍스트가 없습니다.");
  return strFromU8(preview);
};

const textFromHwp = (buffer) => {
  const container = CFB.read(buffer, { type: "buffer" });
  const preview = CFB.find(container, "/PrvText");
  if (!preview?.content) throw new Error("HWP 미리보기 텍스트가 없습니다.");
  return new TextDecoder("utf-16le")
    .decode(preview.content)
    .replace(/\0+$/g, "");
};

const textFromPdf = async (filePath) => {
  const result = spawnSync("pdftotext", ["-layout", filePath, "-"], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "PDF 변환 실패");
  return result.stdout;
};

const rowsFromText = (text) => {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const bracketCells = [...line.matchAll(/<([^>]*)>/g)]
      .map((match) => match[1].replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (bracketCells.length >= 3) {
      rows.push(bracketCells);
      continue;
    }
    const cells = line
      .trim()
      .split(/\t+|\s{2,}/)
      .map((cell) => cell.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (cells.length >= 3) rows.push(cells);
  }
  return rows;
};

const PROVINCE_ALIASES = new Map([
  ["서울", "서울"], ["서울특별시", "서울"],
  ["부산", "부산"], ["부산광역시", "부산"],
  ["대구", "대구"], ["대구광역시", "대구"],
  ["인천", "인천"], ["인천광역시", "인천"],
  ["광주", "광주"], ["광주광역시", "광주"],
  ["대전", "대전"], ["대전광역시", "대전"],
  ["울산", "울산"], ["울산광역시", "울산"],
  ["세종", "세종"], ["세종특별자치시", "세종"],
  ["경기", "경기"], ["경기도", "경기"],
  ["강원", "강원"], ["강원도", "강원"], ["강원특별자치도", "강원"],
  ["충북", "충북"], ["충청북도", "충북"],
  ["충남", "충남"], ["충청남도", "충남"],
  ["전북", "전북"], ["전라북도", "전북"], ["전북특별자치도", "전북"],
  ["전남", "전남"], ["전라남도", "전남"],
  ["경북", "경북"], ["경상북도", "경북"],
  ["경남", "경남"], ["경상남도", "경남"],
  ["제주", "제주"], ["제주특별자치도", "제주"],
]);

const parseLocation = (cells) => {
  for (const cell of cells) {
    const parts = cell.replace(/[<>]/g, "").trim().split(/\s+/);
    const province = PROVINCE_ALIASES.get(parts[0]);
    if (province && parts[1]) {
      return { province, cityCounty: parts[1], region: `${province} ${parts[1]}` };
    }
  }
  for (let index = 0; index < cells.length - 1; index += 1) {
    const province = PROVINCE_ALIASES.get(cells[index].trim());
    if (province && /(?:시|군|구)$/u.test(cells[index + 1].trim())) {
      const cityCounty = cells[index + 1].trim();
      return { province, cityCounty, region: `${province} ${cityCounty}` };
    }
  }
  return null;
};

const parseOccurredAt = (value, fallbackYear) => {
  const cleaned = value
    .replace(/[‘’'`]/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const match = cleaned.match(/(?:(\d{2,4})\s*[.\-/년])?(\d{1,2})\s*[.\-/월](\d{1,2})/);
  if (!match) return null;
  const yearValue = match[1] ? Number(match[1]) : fallbackYear;
  const year = yearValue < 100 ? 2000 + yearValue : yearValue;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const normalizeSpecies = (value) => {
  if (/돼지/u.test(value)) return "pig";
  if (/염소/u.test(value)) return "goat";
  if (/(?:한우|육우|젖소|소)/u.test(value) && !/축종|소재지/u.test(value)) return "cattle";
  return null;
};

const parseHeadCount = (cells, speciesIndex) => {
  for (let index = speciesIndex; index < cells.length; index += 1) {
    const match = cells[index].match(/([\d,]+)\s*(?:두|마리)/u);
    if (match) return Number(match[1].replaceAll(",", ""));
  }
  const next = cells[speciesIndex + 1]?.match(/^\s*([\d,]+)\s*$/);
  return next ? Number(next[1].replaceAll(",", "")) : null;
};

const parseEventRow = (cells, article, attachment) => {
  const sourceSequenceMatch = cells[0]?.match(/^(\d+)\s*차?$/u);
  const isLegacySingleEvent = cells[0]?.trim() === "구제역";
  if (!sourceSequenceMatch && !isLegacySingleEvent) return null;
  const fallbackYear = Number(article.publishedAt.slice(0, 4));
  const occurredAt = cells
    .map((cell) => parseOccurredAt(cell, fallbackYear))
    .find(Boolean);
  const location = parseLocation(cells);
  const speciesIndex = cells.findIndex((cell) => normalizeSpecies(cell));
  if (!occurredAt || !location || speciesIndex < 0) return null;
  const year = Number(occurredAt.slice(0, 4));
  if (year < 2019 || year > 2026) return null;

  return {
    occurredAt,
    sourceSequence: sourceSequenceMatch ? Number(sourceSequenceMatch[1]) : 1,
    species: normalizeSpecies(cells[speciesIndex]),
    raisedHeadCount: parseHeadCount(cells, speciesIndex),
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

const parseMapPoints = (buffer) => {
  const script = new TextDecoder("euc-kr").decode(buffer);
  const block = script.match(/var\s+jsnewList2\s*=\s*(\[[\s\S]*?\])\s*;/)?.[1];
  if (!block) throw new Error("FMD_data.js에서 발생 좌표 배열을 찾지 못했습니다.");
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
  const enriched = events.map((event) => {
    const candidates = points
      .map((point) => ({ point, location: parseLocation([point.region]) }))
      .filter(
        ({ point, location }) =>
          unused.has(point.sourceSequence) &&
          location &&
          cityKey(location.cityCounty) === cityKey(event.cityCounty),
      )
      .sort((left, right) => {
        const leftDays = Math.abs(dayDifference(left.point.occurredAt, event.occurredAt));
        const rightDays = Math.abs(dayDifference(right.point.occurredAt, event.occurredAt));
        return leftDays - rightDays;
      });
    const point = candidates[0]?.point;
    if (!point) {
      throw new Error(`공식 지도 좌표 미대응: ${event.occurredAt} ${event.region} ${event.species}`);
    }
    unused.delete(point.sourceSequence);
    return {
      disease: "FMD",
      ...event,
      coordinates: {
        latitude: point.latitude,
        longitude: point.longitude,
        precision: "농림축산식품부 공개 지도 행정기관 기준점",
        sourceUrl: MAP_DATA_URL,
        sourceSequence: point.sourceSequence,
      },
    };
  });

  const latest2025Source = events
    .filter((event) => event.occurredAt.startsWith("2025-"))
    .sort((left, right) => right.source.publishedAt.localeCompare(left.source.publishedAt))[0]
    ?.source;
  const inferred = points
    .filter((point) => unused.has(point.sourceSequence))
    .map((point) => {
      const location = parseLocation([point.region]);
      if (!location || !point.occurredAt.startsWith("2025-") || !latest2025Source) {
        throw new Error(`공식 첨부 표와 대응되지 않은 지도 좌표: ${point.sourceSequence}`);
      }
      return {
        disease: "FMD",
        occurredAt: point.occurredAt,
        sourceSequence: point.sourceSequence - 14,
        species: "pig",
        raisedHeadCount: null,
        ...location,
        source: {
          ...latest2025Source,
          normalizationNote:
            "구형 HWP 미리보기는 16차 행부터 잘렸으나 공식 총괄의 2025년 소14·돼지5와 지도 19건을 대조해 남은 4건을 돼지로 복원함.",
        },
        coordinates: {
          latitude: point.latitude,
          longitude: point.longitude,
          precision: "농림축산식품부 공개 지도 행정기관 기준점",
          sourceUrl: MAP_DATA_URL,
          sourceSequence: point.sourceSequence,
        },
      };
    });

  return [...enriched, ...inferred]
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        left.coordinates.sourceSequence - right.coordinates.sourceSequence,
    )
    .map((event, index) => ({
      id: `fmd-${String(index + 1).padStart(3, "0")}`,
      ...event,
    }));
};

const main = async () => {
  await mkdir(RAW_DIR, { recursive: true });
  const collectedAt = new Date().toISOString();
  const articles = parseArticles(await fetchText(LIST_URL));
  if (articles.length !== 28) {
    throw new Error(`게시물 28건을 예상했지만 ${articles.length}건을 찾았습니다.`);
  }

  const documents = [];
  const eventVersions = new Map();
  let attachmentCount = 0;

  for (const [articleIndex, article] of articles.entries()) {
    const attachments = parseAttachments(await fetchText(article.sourceUrl));
    const documentAttachments = [];

    for (const attachment of attachments) {
      attachmentCount += 1;
      const localName = `${article.articleId}-${attachment.attachmentId}-${safeFileName(attachment.fileName)}`;
      const filePath = path.join(RAW_DIR, localName);
      const buffer = (await fileExists(filePath))
        ? await readFile(filePath)
        : await fetchBuffer(attachment.downloadUrl);
      if (!(await fileExists(filePath))) await writeFile(filePath, buffer);

      const extension = path.extname(attachment.fileName).toLowerCase();
      let text = "";
      let parseStatus = "unsupported";
      let parseError = null;
      try {
        if (extension === ".hwpx") text = textFromHwpx(buffer);
        else if (extension === ".hwp") text = textFromHwp(buffer);
        else if (extension === ".pdf") text = await textFromPdf(filePath);
        if (text) parseStatus = "parsed";
      } catch (error) {
        parseStatus = "failed";
        parseError = error instanceof Error ? error.message : String(error);
      }

      const rows = rowsFromText(text);
      let parsedEventCount = 0;
      for (const row of rows) {
        const event = parseEventRow(row, article, attachment);
        if (!event) continue;
        parsedEventCount += 1;
        const key = [
          event.occurredAt,
          event.region,
          event.species,
          event.sourceSequence,
        ].join("|");
        const current = eventVersions.get(key);
        if (!current || current.source.publishedAt <= event.source.publishedAt) {
          eventVersions.set(key, event);
        }
      }

      documentAttachments.push({
        attachmentId: attachment.attachmentId,
        fileName: attachment.fileName,
        downloadUrl: attachment.downloadUrl,
        localPath: path.relative(ROOT, filePath).split(path.sep).join("/"),
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

  const sourceEvents = [...eventVersions.values()].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.sourceSequence - right.sourceSequence,
  );
  const parsedYearCounts = Object.fromEntries(
    ["2019", "2023", "2025", "2026"].map((year) => [
      year,
      sourceEvents.filter((event) => event.occurredAt.startsWith(year)).length,
    ]),
  );
  console.log(`원문 표 파싱: ${JSON.stringify(parsedYearCounts)}`);
  const mapDataBuffer = await fetchBuffer(MAP_DATA_URL);
  const mapDataPath = path.join(RAW_DIR, "mafra_fmd_map_data.js");
  await writeFile(mapDataPath, mapDataBuffer);
  const mapPoints = parseMapPoints(mapDataBuffer);
  const events = attachOfficialCoordinates(sourceEvents, mapPoints);
  const speciesCounts = Object.fromEntries(
    ["cattle", "pig", "goat"].map((species) => [
      species,
      events.filter((event) => event.species === species).length,
    ]),
  );
  const expectedSpeciesCounts = { cattle: 35, pig: 6, goat: 1 };

  if (
    events.length !== 42 ||
    mapPoints.length !== 42 ||
    JSON.stringify(speciesCounts) !== JSON.stringify(expectedSpeciesCounts)
  ) {
    throw new Error(
      `정규화 검증 실패: 이벤트 ${events.length}건 · 지도 ${mapPoints.length}건 · ${JSON.stringify(speciesCounts)}`,
    );
  }

  const data = {
    schemaVersion: 1,
    asOf: events.at(-1)?.occurredAt ?? null,
    source: {
      name: "농림축산식품부 가축전염병(FMD) 발생현황 정보공개",
      boardUrl: BOARD_URL,
      collectedAt,
      processing:
        "공식 첨부 표의 발생일·시도·시군구·축종·사육두수와 공식 지도 좌표만 결합. 농장명·농장주·읍면동 이하 상세주소는 결과 JSON에 포함하지 않음.",
    },
    coverage: {
      eventCount: events.length,
      firstOccurredAt: events.at(0)?.occurredAt ?? null,
      lastOccurredAt: events.at(-1)?.occurredAt ?? null,
      speciesCounts,
    },
    validation: {
      expectedEventCount: 42,
      eventCountMatches: events.length === 42,
      expectedSpeciesCounts,
      speciesCountsMatch:
        JSON.stringify(speciesCounts) === JSON.stringify(expectedSpeciesCounts),
      coordinatePointCount: mapPoints.length,
      policy:
        "발생일·행정구역·축종은 첨부 표를 정본으로, 지도 파일에서는 행정기관 기준 좌표만 사용함.",
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

  await writeFile(
    path.join(OUT_DIR, "mafra_fmd_events.json"),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(OUT_DIR, "mafra_fmd_documents.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `완료: 게시물 ${documents.length}건 · 첨부 ${attachmentCount}건 · FMD ${events.length}건`,
  );
};

main().catch((error) => {
  console.error("MAFRA FMD 수집 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
