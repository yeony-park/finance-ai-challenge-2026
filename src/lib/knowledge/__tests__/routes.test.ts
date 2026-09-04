import { describe, expect, it } from "vitest";
import { POST as evidencePost } from "@/app/api/evidence/query/route";
import { POST as searchPost } from "@/app/api/search/route";
import { readJsonBody } from "../http";

const request = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const responseStrings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(responseStrings)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(responseStrings)
        : [];

const FORBIDDEN_USER_TERMS = [
  "데모 규칙 v1",
  "시장 맥락은 상단 판정을 변경",
  "시나리오 입력조건",
  "도산절연",
  "구조화 답변",
  "관측 근거",
  "건물 기본정보 원장 대조",
  "시나리오 주장",
  "등록되고 공개 승인된 근거",
  "검색 가능한 공개 승인 근거",
  "categoryId+productId",
] as const;

describe("knowledge API routes", () => {
  it("전역 검색은 scenarioId/offerId 없이 기존 상품을 찾는다", async () => {
    const response = await searchPost(request("http://localhost/api/search", { q: "한우 1호" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results[0]).toMatchObject({
      id: "livestock-1",
      productId: "livestock-1",
      categoryId: "cattle",
      title: "한우 1호",
      assetKind: "livestock",
      href: "/offers/livestock-1",
      isScenario: false,
    });
    expect(body.results[0].matchedFields).toContain("title");
    expect(body.retrieval).toMatchObject({
      semantic: false,
      strategy: "keyword",
      reason: "disabled",
      planner: { used: false, degraded: true, reason: "disabled" },
    });
  });

  it("artifact-only pig는 evidence-only phase로 직렬화하고 상품 단계 필터와 섞지 않는다", async () => {
    const evidenceOnly = await searchPost(request("http://localhost/api/search", {
      q: "pig-1",
      phase: "evidence-only",
    }));
    expect(evidenceOnly.status).toBe(200);
    expect((await evidenceOnly.json()).results).toContainEqual(expect.objectContaining({
      productId: "pig-1",
      phase: "evidence-only",
      status: "evidence-ready",
    }));

    for (const phase of ["subscription-open", "closed", "listed-trading"] as const) {
      const response = await searchPost(request("http://localhost/api/search", { q: "pig-1", phase }));
      expect(response.status).toBe(200);
      expect((await response.json()).results).not.toContainEqual(expect.objectContaining({ productId: "pig-1" }));
    }
  });

  it("Home UI 호환 200자 상한은 contracts/api의 예약 500자 계약과 다름을 고정한다", async () => {
    expect(
      (await searchPost(request("http://localhost/api/search", { q: "x".repeat(201) }))).status,
    ).toBe(400);
    expect(
      (await searchPost(request("http://localhost/api/search", { q: "가축", limit: 21 }))).status,
    ).toBe(400);
  });

  it("q/query alias를 내부 query로 통일하고 서로 다르면 두 API 모두 거부한다", async () => {
    for (const body of [
      { query: "한우 1호" },
      { q: " 한우 1호 ", query: "한우 1호" },
    ]) {
      const response = await searchPost(request("http://localhost/api/search", body));
      expect(response.status).toBe(200);
      expect((await response.json()).results[0]?.id).toBe("livestock-1");
    }
    expect((await searchPost(request("http://localhost/api/search", {
      q: "한우 1호",
      query: "한우 2호",
    }))).status).toBe(400);

    const evidence = await evidencePost(request("http://localhost/api/evidence/query", {
      scenarioId: "re-scenario-01",
      offerId: "re-offer-01",
      query: "최소투자금 알려줘",
    }));
    expect(evidence.status).toBe(200);
    expect(await evidence.json()).toMatchObject({ answerSource: "structured" });
    expect((await evidencePost(request("http://localhost/api/evidence/query", {
      scenarioId: "re-scenario-01",
      offerId: "re-offer-01",
      q: "연면적",
      query: "최소투자금",
    }))).status).toBe(400);
  });

  it("단일 음절 category alias를 주소·소개 substring으로 오인하지 않는다", async () => {
    const addressResponse = await searchPost(request("http://localhost/api/search", {
      q: "서울스퀘어 주소 알려줘",
      limit: 20,
    }));
    expect(addressResponse.status).toBe(200);
    const addressResults = (await addressResponse.json()).results as Array<{
      productId: string;
      categoryId: string;
    }>;
    expect(addressResults.some((item) => item.productId === "re-offer-01")).toBe(true);
    expect(addressResults.some((item) => item.categoryId === "cattle")).toBe(false);

    const introductionResponse = await searchPost(request("http://localhost/api/search", {
      q: "상품 소개",
    }));
    expect(introductionResponse.status).toBe(200);
    expect((await introductionResponse.json()).results).toEqual([]);
  });

  it("추천·안전·최고·적정가 요청은 상품 순위 대신 검토 기준을 반환한다", async () => {
    for (const q of ["상품 추천해줘", "안전한 상품", "최고 상품", "적정가 알려줘"]) {
      const response = await searchPost(request("http://localhost/api/search", { q }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        mode: "review-guidance",
        results: [],
        guidance: {
          message: expect.stringContaining("순위 대신"),
          reviewAreas: ["asset", "return-cost", "financing", "exit", "operator-history"],
        },
      });
    }
  });

  it("실제 승인 시나리오를 토큰 AND·단계 alias·검토 주제로 찾는다", async () => {
    const search = async (q: string) => {
      const response = await searchPost(request("http://localhost/api/search", { q, limit: 20 }));
      expect(response.status).toBe(200);
      return (await response.json()).results as Array<{
        id: string;
        assetKind: string;
        phase: string;
        isScenario: boolean;
      }>;
    };

    expect((await search("부동산 청약")).some((item) => item.id === "re-offer-01")).toBe(true);
    expect((await search("서울스퀘어 청약"))[0]?.id).toBe("re-offer-01");
    expect((await search("서울스퀘어 청약"))[0]?.isScenario).toBe(true);
    expect((await search("서울스퀘어를 보여줘"))[0]?.id).toBe("re-offer-01");
    const subscriptions = await search("청약 중");
    expect(subscriptions.length).toBeGreaterThan(0);
    expect(subscriptions.every((item) => item.phase === "subscription-open")).toBe(true);
    const listed = await search("상장 거래");
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((item) => item.phase === "listed-trading")).toBe(true);
    for (const q of ["수수료 비용", "매각 회수", "연면적", "금융 검토"]) {
      expect((await search(q)).some((item) => item.assetKind === "real-estate")).toBe(true);
    }

    const ids = (await search("부동산")).map((item) => item.id);
    expect(ids).not.toEqual(
      expect.arrayContaining([
        "real-estate-a",
        "real-estate-bbric-hiwon",
        "real-estate-sou-daejeon-startup",
      ]),
    );
  }, 15_000);

  it("두 API가 JSON content type만 받고 과대 streaming body를 즉시 거부한다", async () => {
    const plain = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ q: "가축" }),
    });
    expect((await searchPost(plain)).status).toBe(400);
    expect(
      (
        await evidencePost(
          new Request("http://localhost/api/evidence/query", {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: JSON.stringify({ scenarioId: "a", offerId: "b", q: "면적" }),
          }),
        )
      ).status,
    ).toBe(400);

    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(20_000));
      },
      cancel() {
        cancelled = true;
      },
    });
    const oversized = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(await readJsonBody(oversized)).toEqual({ ok: false });
    expect(pulls).toBe(2);
    expect(cancelled).toBe(true);
  });

  it("근거 질의는 scenario/offer 범위를 요구하고 미등록 범위에서 abstain한다", async () => {
    const missingScope = await evidencePost(
      request("http://localhost/api/evidence/query", { q: "연면적" }),
    );
    expect(missingScope.status).toBe(400);

    const response = await evidencePost(
      request("http://localhost/api/evidence/query", {
        scenarioId: "not-registered",
        offerId: "not-registered",
        q: "연면적",
        limit: 5,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      outcome: "abstain",
      answerSource: "none",
      evidence: [],
    });

    const crossed = await evidencePost(
      request("http://localhost/api/evidence/query", {
        scenarioId: "re-scenario-01",
        offerId: "re-offer-02",
        q: "연면적",
      }),
    );
    expect(crossed.status).toBe(200);
    expect(await crossed.json()).toMatchObject({
      scenarioId: "re-scenario-01",
      offerId: "re-offer-02",
      outcome: "abstain",
      answerSource: "none",
      evidence: [],
    });
  });

  it("실제 상품은 scenarioId 없이 공통 상품 범위로 질의할 수 있다", async () => {
    expect((await evidencePost(
      request("http://localhost/api/evidence/query", {
        categoryId: "art",
        productId: "not-registered",
        q: "공개 근거",
      }),
    )).status).toBe(400);
    const response = await evidencePost(
      request("http://localhost/api/evidence/query", {
        categoryId: "art",
        productId: "not-registered",
        dataNature: "observed",
        q: "공개 근거",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      categoryId: "art",
      productId: "not-registered",
      dataNature: "observed",
      namespace: "common",
      outcome: "abstain",
      answerSource: "none",
      evidence: [],
    });
  });

  it("productId가 겹쳐도 namespace와 dataNature로 legacy scenario와 common을 구분한다", async () => {
    const legacy = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "real-estate",
      productId: "re-offer-01",
      scenarioId: "re-scenario-01",
      dataNature: "scenario",
      namespace: "legacy-scenario",
      q: "최소투자금은 얼마인가요?",
    }));
    expect(legacy.status).toBe(200);
    expect(await legacy.json()).toMatchObject({
      productId: "re-offer-01",
      dataNature: "scenario",
      namespace: "legacy-scenario",
      answerSource: "structured",
    });

    const common = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "real-estate",
      productId: "re-offer-01",
      scenarioId: "re-scenario-01",
      dataNature: "scenario",
      namespace: "common",
      q: "최소투자금은 얼마인가요?",
    }));
    expect(common.status).toBe(200);
    expect(await common.json()).toMatchObject({
      productId: "re-offer-01",
      dataNature: "scenario",
      namespace: "common",
      outcome: "abstain",
    });

    expect((await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "real-estate",
      productId: "re-offer-01",
      dataNature: "scenario",
      namespace: "legacy-scenario",
      q: "최소투자금",
    }))).status).toBe(400);
  });

  it("표준 근거질의는 구조화값과 5영역 검토를 직접 반환한다", async () => {
    const response = await evidencePost(
      request("http://localhost/api/evidence/query", {
        scenarioId: "re-scenario-01",
        offerId: "re-offer-01",
        q: "금융 검토 결과 알려줘",
        limit: 5,
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      outcome: "answer",
      answerSource: "structured",
      evidence: [],
      cached: false,
      limitations: expect.arrayContaining([
        expect.stringContaining("투자 추천"),
      ]),
      review: {
        ruleVersion: "real-estate-review-v1",
        areas: expect.arrayContaining([
          expect.objectContaining({ area: "financing" }),
        ]),
      },
      retrieval: {
        semantic: false,
        strategy: "keyword",
        reason: "disabled",
        planner: { used: false, degraded: false },
      },
    });
    expect(body).not.toHaveProperty("structuredSources");

    const assetResponse = await evidencePost(
      request("http://localhost/api/evidence/query", {
        scenarioId: "re-scenario-01",
        offerId: "re-offer-01",
        q: "건물정보 검토",
      }),
    );
    expect(assetResponse.status).toBe(200);
    const assetBody = await assetResponse.json();
    expect(assetBody).toMatchObject({
      answerSource: "structured",
      evidence: [],
      structuredSources: [
        expect.objectContaining({
          label: "국토교통부 건축HUB 건축물대장 표제부",
          dataNature: "observed",
        }),
      ],
    });

    const areaResponse = await evidencePost(
      request("http://localhost/api/evidence/query", {
        scenarioId: "re-scenario-01",
        offerId: "re-offer-01",
        q: "연면적을 알려줘",
      }),
    );
    expect(areaResponse.status).toBe(200);
    const areaBody = await areaResponse.json();
    expect(areaBody).toMatchObject({
      answerSource: "structured",
      answer: expect.stringContaining(
        "연면적 건축물대장 공개정보 값은 132,792.56㎡입니다. 상품에 표시된 시나리오 조건과 일치합니다.",
      ),
      evidence: [],
      structuredSources: [
        expect.objectContaining({ dataNature: "observed" }),
      ],
    });
    const exposed = [body, assetBody, areaBody].flatMap(responseStrings).join("\n");
    for (const forbidden of FORBIDDEN_USER_TERMS) expect(exposed).not.toContain(forbidden);
  });
});
