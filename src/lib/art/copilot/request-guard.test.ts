import { describe, expect, test } from "vitest";

import {
  assertAllowedRequestOrigin,
  readBoundedJson,
  RequestBodyError,
  RequestOriginError,
} from "./request-guard";

describe("Evidence Copilot 요청 가드", () => {
  test("JSON 본문을 바이트 상한 안에서만 읽는다", async () => {
    const request = new Request("https://example.test/api/ai/ask-product", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "확인 근거는?" }),
    });

    await expect(readBoundedJson(request, 8_192)).resolves.toEqual({
      question: "확인 근거는?",
    });
  });

  test("JSON이 아니거나 실제 바이트가 상한을 넘으면 거절한다", async () => {
    const textRequest = new Request("https://example.test/api/ai/ask-product", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    await expect(readBoundedJson(textRequest, 8_192)).rejects.toBeInstanceOf(
      RequestBodyError,
    );

    const largeRequest = new Request("https://example.test/api/ai/ask-product", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "가".repeat(3_000) }),
    });
    await expect(readBoundedJson(largeRequest, 8_192)).rejects.toBeInstanceOf(
      RequestBodyError,
    );
  });

  test("cross-site와 production Origin 불일치를 거절한다", () => {
    const crossSite = new Request("https://service.test/api/ai/ask-product", {
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(() => assertAllowedRequestOrigin(crossSite, "development")).toThrow(
      RequestOriginError,
    );

    const wrongOrigin = new Request(
      "https://service.test/api/ai/ask-product",
      {
        headers: { host: "service.test", origin: "https://attacker.test" },
      },
    );
    expect(() => assertAllowedRequestOrigin(wrongOrigin, "production")).toThrow(
      RequestOriginError,
    );

    const sameOrigin = new Request(
      "http://internal.test/api/ai/ask-product",
      {
        headers: {
          origin: "https://service.test",
          "x-forwarded-host": "service.test",
          "x-forwarded-proto": "https",
        },
      },
    );
    expect(() =>
      assertAllowedRequestOrigin(sameOrigin, "production"),
    ).not.toThrow();
  });
});
