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

describe("knowledge API routes", () => {
  it("전역 검색은 scenarioId/offerId 없이 기존 상품을 찾는다", async () => {
    const response = await searchPost(request("http://localhost/api/search", { q: "가축 1호" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results[0]).toMatchObject({
      id: "livestock-1",
      title: "가축 1호",
      assetKind: "livestock",
      href: "/offers/livestock-1",
    });
    expect(body.results[0].matchedFields).toContain("title");
  });

  it("전역 검색의 q 길이와 limit 상한을 검증한다", async () => {
    expect(
      (await searchPost(request("http://localhost/api/search", { q: "x".repeat(201) }))).status,
    ).toBe(400);
    expect(
      (await searchPost(request("http://localhost/api/search", { q: "가축", limit: 21 }))).status,
    ).toBe(400);
  });

  it("실제 승인 시나리오를 토큰 AND·단계 alias·검토 주제로 찾는다", async () => {
    const search = async (q: string) => {
      const response = await searchPost(request("http://localhost/api/search", { q, limit: 20 }));
      expect(response.status).toBe(200);
      return (await response.json()).results as Array<{
        id: string;
        assetKind: string;
        phase: string;
      }>;
    };

    expect((await search("부동산 청약")).some((item) => item.id === "re-offer-01")).toBe(true);
    expect((await search("서울스퀘어 청약"))[0]?.id).toBe("re-offer-01");
    const subscriptions = await search("청약 중");
    expect(subscriptions.length).toBeGreaterThan(0);
    expect(subscriptions.every((item) => item.phase === "subscription-open")).toBe(true);
    const listed = await search("상장 거래");
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((item) => item.phase === "listed-trading")).toBe(true);
    for (const q of ["수수료 비용", "매각 회수", "연면적"]) {
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
  });

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
    expect(await response.json()).toMatchObject({ outcome: "abstain", evidence: [] });
  });
});
