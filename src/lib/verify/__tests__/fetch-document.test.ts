import { readFile } from "node:fs/promises";
import { zipSync } from "fflate";
import { describe, expect, test, vi } from "vitest";
import {
  collectRawDocument,
  fetchDocumentZip,
  listRawDocuments,
  MAX_DART_RESPONSE_BYTES,
  MAX_DART_XML_BYTES,
} from "../dart/fetch-document";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const RCP_NO = "20260806000159";
const RAW_XML_PATH = rawXmlPath(RCP_NO);

const okResponse = (body: BodyInit) =>
  (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;

describe.skipIf(!hasLocalFile(RAW_XML_PATH))(
  `DART 원문 수집 — 로컬 원문 재사용 ${hasLocalFile(RAW_XML_PATH) ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
    test("이미 받아둔 원문이 있으면 네트워크를 타지 않는다", async () => {
      let called = false;
      const fetchImpl = (async () => {
        called = true;
        return new Response("", { status: 200 });
      }) as unknown as typeof fetch;

      const result = await collectRawDocument(RCP_NO, { fetchImpl });

      expect(called).toBe(false);
      expect(result.files).toContain(`${RCP_NO}.xml`);
    });
  },
);

describe("DART 원문 수집", () => {
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

  test("streaming 응답·ZIP 해제 크기와 exact XML entry를 제한한다", async () => {
    const rcpNo = "20990101000001";
    const exactName = `${rcpNo}.xml`;
    const valid = await fetchDocumentZip(
      rcpNo,
      "key",
      okResponse(zipSync({ [exactName]: new TextEncoder().encode("<DOCUMENT />") })),
    );
    expect(Object.keys(valid)).toEqual([exactName]);

    await expect(fetchDocumentZip(
      rcpNo,
      "key",
      okResponse(zipSync({ [exactName]: new Uint8Array(), "other.xml": new Uint8Array() })),
    )).rejects.toThrow("exact rcpNo XML");
    await expect(fetchDocumentZip(
      rcpNo,
      "key",
      okResponse(zipSync({ [exactName]: new Uint8Array(MAX_DART_XML_BYTES + 1) })),
    )).rejects.toThrow("해제 크기");
    await expect(fetchDocumentZip(
      rcpNo,
      "key",
      okResponse(new Uint8Array(MAX_DART_RESPONSE_BYTES + 1)),
    )).rejects.toThrow("응답 크기");
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

test("Docker context는 raw/local-only 데이터만 제외한다", async () => {
  const dockerignore = await readFile(".dockerignore", "utf8");
  for (const entry of ["data/raw/", "data/**/raw/", "data/snapshots/", "data/reports/", "data/goldset/"]) {
    expect(dockerignore.split(/\r?\n/)).toContain(entry);
  }
  expect(dockerignore).not.toContain("data/knowledge/sources/");
});

describe("접수번호 가드 — 경로 조립 전 최전방", () => {
  test("14자리 숫자가 아니면 파일시스템에 닿기 전에 실패한다", async () => {
    for (const bad of ["../../etc", "2026080600015", "abc"]) {
      await expect(listRawDocuments(bad)).rejects.toThrow(/접수번호 형식/);
      await expect(
        collectRawDocument(bad, { fetchImpl: okResponse("") }),
      ).rejects.toThrow(/접수번호 형식/);
    }
  });

  test("형식 위반을 '원문 없음'으로 삼키지 않는다", async () => {
    await expect(listRawDocuments("20990101000001")).resolves.toEqual([]);
  });
});
