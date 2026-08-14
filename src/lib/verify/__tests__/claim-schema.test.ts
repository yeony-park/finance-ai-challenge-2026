import { describe, expect, test } from "vitest";

import {
  custodyLocationSchema,
  traceNo9Schema,
} from "../claims/schema";

describe("traceNo9Schema — 표에서 선행 0이 떨어진 이력번호를 복원한다", () => {
  test("9자리는 그대로 통과한다", () => {
    expect(traceNo9Schema.parse("212786152")).toBe("212786152");
  });

  test("선행 0이 떨어진 10자리는 12자리로 복원해 뒤 9자리를 쓴다", () => {
    expect(traceNo9Schema.parse("2187292049")).toBe("187292049");
  });

  test("완전한 12자리는 뒤 9자리를 쓴다", () => {
    expect(traceNo9Schema.parse("002212786152")).toBe("212786152");
  });

  test("복원해도 소 이력번호 체계(002)가 아니면 거부한다", () => {
    expect(() => traceNo9Schema.parse("112187292049")).toThrow();
  });

  test("자릿수가 어긋나면 거부한다", () => {
    expect(() => traceNo9Schema.parse("12345")).toThrow();
    expect(() => traceNo9Schema.parse("1234567890123")).toThrow();
  });
});

describe("custodyLocationSchema — 셀 안 줄바꿈을 한 칸 공백으로 정규화한다", () => {
  test("멀티라인 보관장소가 한 줄로 붙는다", () => {
    expect(custodyLocationSchema.parse("강원도 평창군\n진부면")).toBe(
      "강원도 평창군 진부면",
    );
  });
});
