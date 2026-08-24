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
  readonly positions: readonly PdfTextPosition[];
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
    let totalArea = 0;
    let totalCharacters = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        if (content.items.length > MAX_PDF_ITEMS_PER_PAGE) {
          throw new PdfLimitError(
            `PDF 한 페이지의 텍스트 항목은 ${MAX_PDF_ITEMS_PER_PAGE}개를 초과할 수 없습니다.`,
          );
        }
        const extractedCharacters = content.items.reduce(
          (sum, item) => sum + ("str" in item ? item.str.length : 0),
          0,
        );
        if (extractedCharacters > MAX_PDF_TEXT_CHARS_PER_PAGE) {
          throw new PdfLimitError(
            `PDF 한 페이지의 텍스트는 ${MAX_PDF_TEXT_CHARS_PER_PAGE}자를 초과할 수 없습니다.`,
          );
        }
        const positions: PdfTextPosition[] = content.items.flatMap((item) => {
          if (!("str" in item) || item.str.length === 0) return [];
          const textItem = item as TextItem;
          return [{
            text: textItem.str,
            x: textItem.transform[4],
            y: textItem.transform[5],
            width: Math.max(0, textItem.width),
            height: Math.max(0, textItem.height),
          }];
        });
        const text = positions.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
        totalArea += viewport.width * viewport.height;
        totalCharacters += text.replace(/\s/g, "").length;
        pages.push({ page: pageNumber, text, positions });
      } finally {
        page.cleanup();
      }
    }

    const density = totalCharacters / Math.max(1, totalArea);
    const ocrRequired = totalCharacters < Math.max(20, pages.length * 10) || density < 0.00002;
    return {
      status: ocrRequired ? "ocr_required" : "ready",
      sourceHash,
      pages,
      limitation: ocrRequired
        ? "추출된 텍스트 밀도가 낮아 OCR 검토가 필요합니다."
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
  const document = DocumentRecordSchema.parse({ ...base, status: parsed.status });
  const chunks =
    parsed.status === "ready"
      ? parsed.pages.filter((page) => page.text.length > 0).map((page) =>
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
