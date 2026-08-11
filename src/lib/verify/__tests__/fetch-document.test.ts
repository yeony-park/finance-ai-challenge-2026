import { describe, expect, test, vi } from "vitest";
import {
  collectRawDocument,
  fetchDocumentZip,
  listRawDocuments,
} from "../dart/fetch-document";

const okResponse = (body: BodyInit) =>
  (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;

describe("DART 원문 수집", () => {
  test("이미 받아둔 원문이 있으면 네트워크를 타지 않는다", async () => {
    // Arrange
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response("", { status: 200 });
    }) as unknown as typeof fetch;

    // Act
    const result = await collectRawDocument("20260806000159", { fetchImpl });

    // Assert
    expect(called).toBe(false);
    expect(result.files).toContain("20260806000159.xml");
  });

  test("ZIP이 아닌 오류 응답은 가짜 원문을 만들지 않고 사유와 함께 실패한다", async () => {
    const errorXml =
      "<result><status>013</status><message>조회된 데이타가 없습니다.</message></result>";

    await expect(
      fetchDocumentZip("20990101000001", "key", okResponse(errorXml)),
    ).rejects.toThrow(/status=013/);
  });

  test("HTTP 오류는 조용히 삼키지 않는다", async () => {
    const failing = (async () =>
      new Response("", { status: 500, statusText: "Server Error" })) as unknown as typeof fetch;

    await expect(
      fetchDocumentZip("20260806000159", "key", failing),
    ).rejects.toThrow(/HTTP 500/);
  });

  test("키가 없으면 수집을 시도하지 않고 명시적으로 실패한다", async () => {
    vi.stubEnv("DART_API_KEY", "");
    try {
      await expect(
        collectRawDocument("20990101000001", {
          dataDir: "data",
          fetchImpl: okResponse(""),
        }),
      ).rejects.toThrow(/DART_API_KEY/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("받아둔 원문이 없는 접수번호는 빈 목록", async () => {
    expect(await listRawDocuments("20990101000001")).toEqual([]);
  });
});
