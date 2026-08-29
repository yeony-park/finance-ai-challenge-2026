import { describe, expect, it } from "vitest";
import {
  MAX_PDF_BYTES,
  buildKnowledgeRecordsFromPdf,
  parsePdf,
  sha256,
} from "../pdf";

const pdfBytes = (text: string): Uint8Array => {
  const stream = text
    ? `BT /F1 12 Tf 20 80 Td (${text}) Tj ET`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

describe("PDF batch parser", () => {
  it("Uint8Array에서 페이지 텍스트와 위치를 추출한다", async () => {
    const bytes = pdfBytes("Public evidence text for deterministic extraction.");
    const parsed = await parsePdf(bytes);
    expect(parsed.status).toBe("ready");
    expect(parsed.sourceHash).toBe(sha256(bytes));
    expect(parsed.pages[0].text).toContain("Public evidence text");
    expect(parsed.pages[0].positions[0]).toMatchObject({ text: expect.any(String) });
    expect(parsed.pages[0]).toMatchObject({ quality: "ready", reasonCodes: [], metrics: { itemCount: expect.any(Number), characterCount: expect.any(Number), density: expect.any(Number) } });
  });

  it("텍스트가 비어 있으면 OCR 필요 상태로 반환한다", async () => {
    const parsed = await parsePdf(pdfBytes(""));
    expect(parsed.status).toBe("ocr_required");
    expect(parsed.pages[0]).toMatchObject({ quality: "unsupported_scan", canonicalText: "", reasonCodes: ["no-text-layer"], metrics: { characterCount: 0 } });
  });

  it("최대 입력 바이트를 넘으면 파서를 시작하지 않고 실패한다", async () => {
    const parsed = await parsePdf(new Uint8Array(MAX_PDF_BYTES + 1));
    expect(parsed).toMatchObject({ status: "failed", pages: [] });
    expect(parsed.limitation).toContain(String(MAX_PDF_BYTES));
  });

  it("문서와 실제 페이지별 공개 chunk를 zod 계약으로 조립한다", async () => {
    const records = await buildKnowledgeRecordsFromPdf(
      pdfBytes("Public evidence text for deterministic extraction."),
      {
        categoryId: "real-estate",
        scenarioId: "scenario-001",
        offerId: "offer-001",
        dataNature: "observed",
        sourceKind: "official-document",
        documentId: "document-pdf",
        title: "공식 PDF",
        sourceUrl: "https://example.com/document.pdf",
        asOf: "2026-08-24",
        approved: true,
        limitations: [],
      },
    );
    expect(records.document).toMatchObject({ status: "ready", sourceHash: expect.any(String) });
    expect(records.chunks).toHaveLength(1);
    expect(records.chunks[0]).toMatchObject({
      chunkId: "document-pdf-p1",
      documentId: "document-pdf",
      page: 1,
      chunkHash: expect.any(String),
    });
  });

  it("OCR 필요 상태에서는 chunk를 만들지 않는다", async () => {
    const records = await buildKnowledgeRecordsFromPdf(pdfBytes(""), {
      categoryId: "real-estate",
      scenarioId: "scenario-001",
      offerId: "offer-001",
      dataNature: "scenario",
      sourceKind: "scenario-input",
      documentId: "scenario-pdf",
      title: "시나리오 PDF",
      sourceUrl: "/scenario-documents/scenario.pdf",
      asOf: "2026-08-24",
      approved: true,
      limitations: [],
    });
    expect(records.document.status).toBe("ocr_required");
    expect(records.chunks).toEqual([]);
  });

  it("손상 PDF에서 내부 오류문 없이 안전한 실패 상태를 반환한다", async () => {
    const parsed = await parsePdf(new Uint8Array([1, 2, 3, 4]));
    expect(["damaged", "failed"]).toContain(parsed.status);
    expect(parsed.pages).toEqual([]);
    expect(parsed.limitation).not.toContain("Error");
  });
});
