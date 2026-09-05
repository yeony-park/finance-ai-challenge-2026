import { createHash } from "node:crypto";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  TextItem,
} from "pdfjs-dist/types/src/display/api";
import type { z } from "zod";
import {
  ChunkRecordSchema,
  DocumentRecordSchema,
  TextPositionSchema,
  type ChunkRecord,
  type DocumentRecord,
} from "./schema";

export type PdfTextPosition = z.infer<typeof TextPositionSchema>;

export interface ParsedPdfPage {
  readonly page: number;
  readonly text: string;
  readonly canonicalText: string;
  readonly positions: readonly PdfTextPosition[];
  readonly quality: "ready" | "text_insufficient" | "unsupported_scan";
  readonly reasonCodes: readonly string[];
  readonly metrics: {
    readonly itemCount: number;
    readonly characterCount: number;
    readonly density: number;
  };
  readonly limitations: readonly string[];
}

export interface ParsedPdf {
  readonly status: "ready" | "ocr_required" | "damaged" | "encrypted" | "failed";
  readonly sourceHash: string;
  readonly pages: readonly ParsedPdfPage[];
  readonly limitation: string | null;
}

export interface PdfRecordMetadata {
  readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
  readonly scenarioId: string;
  readonly offerId: string;
  readonly dataNature: "observed" | "scenario";
  readonly sourceKind:
    | "official-document"
    | "external-observation"
    | "scenario-input";
  readonly documentId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly approved: boolean;
  readonly limitations: readonly string[];
}

export interface PdfKnowledgeRecords {
  readonly document: DocumentRecord;
  readonly chunks: readonly ChunkRecord[];
}

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 250;
export const MAX_PDF_ITEMS_PER_PAGE = 20_000;
export const MAX_PDF_TEXT_CHARS_PER_PAGE = 100_000;

class PdfLimitError extends Error {
  override readonly name = "PdfLimitError";
}

export const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

export const calculateChunkHash = (
  value: {
    readonly page: number;
    readonly text: string;
    readonly positions: readonly PdfTextPosition[];
  },
): string =>
  sha256(JSON.stringify({ page: value.page, text: value.text, positions: value.positions }));

export const calculateCommonChunkHash = (
  value: {
    readonly page: number;
    readonly text: string;
    readonly canonicalText: string;
    readonly positions: readonly PdfTextPosition[];
    readonly pageQuality: "ready";
  },
): string => sha256(JSON.stringify({
  page: value.page,
  text: value.text,
  canonicalText: value.canonicalText,
  positions: value.positions,
  pageQuality: value.pageQuality,
}));

interface LayoutTextItem extends PdfTextPosition {
  readonly hasEOL?: boolean;
}

export const assemblePdfTextItems = (
  items: readonly LayoutTextItem[],
): { readonly text: string; readonly positions: readonly PdfTextPosition[] } => {
  let text = "";
  let previous: LayoutTextItem | undefined;
  for (const item of items) {
    if (!item.text) continue;
    if (previous) {
      const lineTolerance = Math.max(1.5, Math.min(previous.height, item.height) * 0.45);
      const newLine = previous.hasEOL === true || Math.abs(previous.y - item.y) > lineTolerance;
      const averageGlyphWidth = previous.text.length > 0
        ? previous.width / previous.text.length
        : previous.height * 0.5;
      const horizontalGap = item.x - (previous.x + previous.width);
      const needsSpace = horizontalGap > Math.max(1, averageGlyphWidth * 0.45);
      text += newLine ? "\n" : needsSpace ? " " : "";
    }
    text += item.text;
    previous = item;
  }
  return {
    text: text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
    positions: items.map((item) => ({
      text: item.text,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    })),
  };
};

export const hasCriticalTextLoss = (text: string): boolean =>
  /\uFFFD/.test(text) || /(?:\d|원|%|년|월|일)\s*[?□]\s*(?:\d|원|%|년|월|일)/.test(text);

const canonicalize = (text: string): string =>
  text.normalize("NFKC").replace(/\s+/g, " ").trim();

export const removeRepeatedPageBoundaries = (pages: readonly string[]): readonly string[] => {
  const boundaries = pages.map((text) => {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length < 2
      ? { first: "", last: "" }
      : { first: lines[0] ?? "", last: lines.at(-1) ?? "" };
  });
  const repeated = { first: new Set<string>(), last: new Set<string>() };
  for (const edge of ["first", "last"] as const) {
    const counts = new Map<string, number>();
    for (const boundary of boundaries) {
      const line = canonicalize(boundary[edge]);
      if (line.length >= 1) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    for (const [line, count] of counts) {
      if (count >= 2 && count / Math.max(1, pages.length) >= 0.5) repeated[edge].add(line);
    }
  }
  return pages.map((text) => {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines[0] && repeated.first.has(canonicalize(lines[0]))) lines.shift();
    if (lines.at(-1) && repeated.last.has(canonicalize(lines.at(-1)!))) lines.pop();
    return canonicalize(lines.join("\n"));
  });
};

export const parsePdf = async (input: Uint8Array): Promise<ParsedPdf> => {
  const sourceHash = sha256(input);
  if (input.byteLength > MAX_PDF_BYTES) {
    return {
      status: "failed",
      sourceHash,
      pages: [],
      limitation: `PDF 입력은 ${MAX_PDF_BYTES}바이트를 초과할 수 없습니다.`,
    };
  }
  const data = new Uint8Array(input);

  let task: PDFDocumentLoadingTask | undefined;
  let document: PDFDocumentProxy | undefined;

  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    task = getDocument({ data, useWorkerFetch: false });
    document = await task.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new PdfLimitError(`PDF 페이지는 ${MAX_PDF_PAGES}쪽을 초과할 수 없습니다.`);
    }
    const pages: ParsedPdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        if (content.items.length > MAX_PDF_ITEMS_PER_PAGE) {
          pages.push({
            page: pageNumber,
            text: "",
            canonicalText: "",
            positions: [],
            quality: "text_insufficient",
            reasonCodes: ["item-limit"],
            metrics: { itemCount: content.items.length, characterCount: 0, density: 0 },
            limitations: [`텍스트 항목이 페이지 상한 ${MAX_PDF_ITEMS_PER_PAGE}개를 초과해 제외했습니다.`],
          });
          continue;
        }
        const extractedCharacters = content.items.reduce(
          (sum, item) => sum + ("str" in item ? item.str.length : 0),
          0,
        );
        if (extractedCharacters > MAX_PDF_TEXT_CHARS_PER_PAGE) {
          pages.push({
            page: pageNumber,
            text: "",
            canonicalText: "",
            positions: [],
            quality: "text_insufficient",
            reasonCodes: ["text-limit"],
            metrics: { itemCount: content.items.length, characterCount: extractedCharacters, density: 0 },
            limitations: [`추출 텍스트가 페이지 상한 ${MAX_PDF_TEXT_CHARS_PER_PAGE}자를 초과해 제외했습니다.`],
          });
          continue;
        }
        const layoutItems: LayoutTextItem[] = content.items.flatMap((item) => {
          if (!("str" in item) || item.str.length === 0) return [];
          const textItem = item as TextItem;
          return [{
            text: textItem.str,
            x: textItem.transform[4],
            y: textItem.transform[5],
            width: Math.max(0, textItem.width),
            height: Math.max(0, textItem.height),
            hasEOL: textItem.hasEOL,
          }];
        });
        const { text, positions } = assemblePdfTextItems(layoutItems);
        const characters = text.replace(/\s/g, "").length;
        const density = characters / Math.max(1, viewport.width * viewport.height);
        const integrityIssue = hasCriticalTextLoss(text);
        const quality = positions.length === 0
          ? "unsupported_scan" as const
          : characters < 20 || density < 0.00002 || integrityIssue
            ? "text_insufficient" as const
            : "ready" as const;
        const limitations = [
          ...(quality === "unsupported_scan" ? ["텍스트 레이어가 없어 OCR 또는 원문 확인이 필요합니다."] : []),
          ...(quality === "text_insufficient" ? ["추출 텍스트가 부족하여 이 페이지를 검색 근거에서 제외했습니다."] : []),
          ...(integrityIssue ? ["핵심 숫자·날짜·비율 토큰의 문자 손실 가능성이 있습니다."] : []),
        ];
        const reasonCodes = [
          ...(positions.length === 0 ? ["no-text-layer"] : []),
          ...(positions.length > 0 && characters < 20 ? ["low-character-count"] : []),
          ...(positions.length > 0 && density < 0.00002 ? ["low-density"] : []),
          ...(integrityIssue ? ["critical-text-loss"] : []),
        ];
        pages.push({
          page: pageNumber,
          text,
          canonicalText: canonicalize(text),
          positions,
          quality,
          reasonCodes,
          metrics: { itemCount: content.items.length, characterCount: characters, density },
          limitations,
        });
      } finally {
        page.cleanup();
      }
    }

    const canonicalPages = removeRepeatedPageBoundaries(pages.map((page) => page.text));
    const finalPages = pages.map((page, index) => {
      const canonicalText = canonicalPages[index];
      return page.quality === "ready" && canonicalText.length === 0
        ? {
            ...page,
            canonicalText,
            quality: "text_insufficient" as const,
            reasonCodes: [...page.reasonCodes, "repeated-boundary-only"],
            limitations: [...page.limitations, "반복 머리말·꼬리말을 제외한 검색 텍스트가 없습니다."],
          }
        : { ...page, canonicalText };
    });
    const readyPages = finalPages.filter((page) => page.quality === "ready").length;
    const ocrRequired = readyPages === 0;
    return {
      status: ocrRequired ? "ocr_required" : "ready",
      sourceHash,
      pages: finalPages,
      limitation: ocrRequired
        ? "추출된 텍스트 밀도가 낮아 OCR 검토가 필요합니다."
        : readyPages < finalPages.length
          ? "일부 페이지의 텍스트 품질이 낮아 검색 근거에서 제외했습니다."
          : null,
    };
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "";
    const status =
      name === "PasswordException"
        ? "encrypted"
        : name === "InvalidPDFException" || name === "MissingPDFException"
          ? "damaged"
          : "failed";
    return {
      status,
      sourceHash,
      pages: [],
      limitation:
        error instanceof PdfLimitError
          ? error.message
          : status === "encrypted"
          ? "암호화된 PDF는 처리할 수 없습니다."
          : status === "damaged"
            ? "손상되었거나 유효하지 않은 PDF입니다."
            : "PDF 텍스트를 안전하게 추출하지 못했습니다.",
    };
  } finally {
    if (document) {
      await document.cleanup().catch(() => undefined);
      const destroy = (document as PDFDocumentProxy & { destroy?: () => Promise<void> }).destroy;
      if (typeof destroy === "function") {
        await destroy.call(document).catch(() => undefined);
      }
    }
    if (task) await task.destroy().catch(() => undefined);
  }
};

export const buildKnowledgeRecordsFromPdf = async (
  input: Uint8Array,
  metadata: PdfRecordMetadata,
): Promise<PdfKnowledgeRecords> => {
  const parsed = await parsePdf(input);
  const limitations = [
    ...metadata.limitations,
    ...(parsed.limitation ? [parsed.limitation] : []),
  ];
  const base = {
    schemaVersion: 1 as const,
    categoryId: metadata.categoryId,
    scenarioId: metadata.scenarioId,
    offerId: metadata.offerId,
    dataNature: metadata.dataNature,
    sourceKind: metadata.sourceKind,
    documentId: metadata.documentId,
    title: metadata.title,
    sourceUrl: metadata.sourceUrl,
    asOf: metadata.asOf,
    sourceHash: parsed.sourceHash,
    approvedForPublic: metadata.approved,
    limitations,
  };
  const documentStatus = parsed.status === "ready" && parsed.pages.some((page) => page.quality !== "ready")
    ? "partial"
    : parsed.status;
  const document = DocumentRecordSchema.parse({ ...base, status: documentStatus });
  const chunks =
    parsed.status === "ready"
      ? parsed.pages.filter((page) => page.quality === "ready" && page.text.length > 0).map((page) =>
          ChunkRecordSchema.parse({
            ...base,
            chunkId: `${metadata.documentId}-p${page.page}`,
            page: page.page,
            text: page.text,
            positions: page.positions,
            chunkHash: calculateChunkHash(page),
            status: "ready",
          }),
        )
      : [];
  return { document, chunks };
};
