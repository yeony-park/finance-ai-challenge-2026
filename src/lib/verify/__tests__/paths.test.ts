import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertOfferId,
  assertRcpNo,
  offerDataDir,
  rawDataDir,
} from "../paths";

describe("접수번호 가드", () => {
  test("14자리 숫자만 통과한다", () => {
    expect(assertRcpNo("20260806000159")).toBe("20260806000159");
  });

  test.each([
    "2026080600015",
    "202608060001590",
    "2026-08-06-0001",
    "abcdefghijklmn",
    "",
  ])("형식 위반 %s 은 예외", (bad) => {
    expect(() => assertRcpNo(bad)).toThrow(/접수번호 형식/);
  });

  test("경로 탈출 시도는 디렉토리를 만들기 전에 차단된다", () => {
    for (const attack of [
      "../../etc",
      "..%2f..%2fetc",
      "20260806000159/../../../etc",
      "/etc/passwd",
    ]) {
      expect(() => rawDataDir(attack)).toThrow();
    }
  });

  test("정상 접수번호는 data/raw 아래로 해석된다", () => {
    const dir = rawDataDir("20260806000159");
    expect(dir).toBe(
      path.join(path.resolve("data", "raw"), "20260806000159"),
    );
  });
});

describe("공모 식별자 가드", () => {
  test("소문자·숫자·하이픈만 통과한다", () => {
    expect(assertOfferId("livestock-9")).toBe("livestock-9");
  });

  test.each(["../secret", "Livestock-9", "live stock", "livestock/9", "", "live_stock"])(
    "형식 위반 %s 은 예외",
    (bad) => {
      expect(() => assertOfferId(bad)).toThrow(/공모 식별자 형식/);
    },
  );

  test("경로 탈출 시도는 리포트 디렉토리를 만들기 전에 차단된다", () => {
    for (const attack of ["../../etc", "livestock-9/../../..", "/etc"]) {
      expect(() => offerDataDir("public", attack)).toThrow();
    }
  });

  test("정상 공모 식별자는 data/{section} 아래로 해석된다", () => {
    expect(offerDataDir("public", "livestock-9")).toBe(
      path.join(path.resolve("data", "public"), "livestock-9"),
    );
    expect(offerDataDir("reports", "livestock-9")).toBe(
      path.join(path.resolve("data", "reports"), "livestock-9"),
    );
  });
});
