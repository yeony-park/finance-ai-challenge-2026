import { describe, expect, test } from "vitest";

import {
  loadRealEstateOffer,
  parseRealEstateOffer,
  type RealEstateOffer,
} from "../claims/real-estate";
import {
  loadRealEstateInvestmentReview,
  reviewRealEstateInvestment,
} from "../real-estate-investment-review";
import { loadLatestReport } from "../report/load";

const REVIEWED_ON = "2026-08-23";

const loadHiwon = async () => {
  const offer = await loadRealEstateOffer("real-estate-bbric-hiwon");
  if (offer.schemaVersion !== 2 || !offer.productSummary) {
    throw new Error("희원감천 v2 상품 요약이 없습니다");
  }
  const report = (await loadLatestReport(offer.offerId)).report;
  return { offer, report };
};

interface StructuredOptions {
  readonly eventStatus?: "open" | "resolved" | "unknown";
  readonly eventOn?: string;
  readonly includeEvent?: boolean;
  readonly completeExit?: boolean;
  readonly consistentPayout?: boolean;
  readonly roles?: "distinct" | "duplicate";
  readonly disclosures?: boolean;
  readonly disclosureValidThrough?: string;
  readonly offerTerms?: boolean;
  readonly includeMarket?: boolean;
  readonly futureMarket?: boolean;
}

const withStructuredReview = async (
  options: StructuredOptions = {},
): Promise<RealEstateOffer> => {
  const { offer } = await loadHiwon();
  const productSummary = offer.schemaVersion === 2 ? offer.productSummary : undefined;
  if (!productSummary) throw new Error("희원감천 상품 요약이 없습니다");
  const official = offer.sources.find(
    (source) => source.sourceKind === "official-document",
  );
  const platform = offer.sources.filter(
    (source) => source.sourceKind === "platform-claim",
  );
  const lease = platform.find((source) => source.label.includes("임대차계약 해지"));
  if (!official || !platform[0] || !platform[1] || !lease) {
    throw new Error("테스트 출처가 없습니다");
  }
  const marketSource = {
    sourceKind: "external-observation" as const,
    label: "ECOS 기준금리 공개 관측",
    url: "https://ecos.bok.or.kr/example",
    asOf: REVIEWED_ON,
    collectedAt: `${REVIEWED_ON}T00:00:00.000Z`,
    method: "manual" as const,
    status: "ok",
    limitations: ["테스트 구조화 관측"],
  };
  const importantEvents = options.includeEvent
    ? [
        {
          eventId: "lease-termination-1",
          kind: "lease-termination" as const,
          exactProduct: true,
          directOriginal: true,
          eventOn: options.eventOn ?? "2026-05-27",
          status: options.eventStatus ?? "open",
          materialityBasis: "contract-termination" as const,
          source: lease.url,
        },
      ]
    : [];
  const roleSources =
    options.roles === "distinct" ? [official, platform[0]] : [official, official];
  return parseRealEstateOffer(
    {
      ...offer,
      sources:
        options.includeMarket || options.futureMarket
          ? [...offer.sources, marketSource]
          : offer.sources,
      ...(options.completeExit
        ? {
            tradabilityStatus: "available",
            productSummary: {
              ...productSummary,
              saleLiquidationCondition: {
                status: "confirmed",
                value: "직접 원문 확인",
                note: "테스트용 구조화 조건",
                source: {
                  label: official.label,
                  url: official.url,
                  asOf: official.asOf,
                },
              },
            },
          }
        : {}),
      ...(options.consistentPayout
        ? {
            productSummary: {
              ...productSummary,
              ...(options.completeExit
                ? {
                    saleLiquidationCondition: {
                      status: "confirmed",
                      value: "직접 원문 확인",
                      note: "테스트용 구조화 조건",
                      source: {
                        label: official.label,
                        url: official.url,
                        asOf: official.asOf,
                      },
                    },
                  }
                : {}),
              latestActualDistribution: {
                ...productSummary.latestActualDistribution,
                totalAmountWon: 100,
                totalUnits: 3,
                sourceAmountPerUnitWon: 33.33,
                simpleCalculatedAmountPerUnitWon: 33.3333,
                consistencyStatus: "consistent",
              },
            },
          }
        : {}),
      investmentReview: {
        ...(options.offerTerms === false
          ? {}
          : { offerTermsSource: platform[0].url }),
        importantEvents,
        roleHistory: options.roles
          ? (["manager", "trustee"] as const).map((role, index) => ({
              role,
              entityId: `entity-${index}`,
              legalName: `테스트 법인 ${index + 1}`,
              relationship: "fund-party" as const,
              events: [
                {
                  eventOn: index === 0 ? REVIEWED_ON : "2024-11-22",
                  outcome: "fulfilled" as const,
                  source: roleSources[index]!.url,
                },
              ],
            }))
          : [],
        marketContext: options.includeMarket || options.futureMarket
          ? [
              {
                provider: "ECOS",
                metric: "base-rate",
                observedOn: options.futureMarket ? "2026-08-24" : REVIEWED_ON,
                publishedOn: options.futureMarket ? "2026-08-24" : REVIEWED_ON,
                value: 2.5,
                unit: "percent",
                source: marketSource.url,
              },
            ]
          : [],
        ...(options.disclosures
          ? {
              materialDisclosuresCheck: {
                checkedOn: REVIEWED_ON,
                validThrough:
                  options.disclosureValidThrough ?? REVIEWED_ON,
                status: importantEvents.length > 0 ? "events-found" : "none-found",
                source: official.url,
              },
            }
          : {}),
      },
    },
    "(투자 검토 테스트)",
  );
};

const reportWithAllBuildingMatches = async () => {
  const { report } = await loadHiwon();
  return {
    ...report,
    judgements: report.judgements.map((item) =>
      item.claim.kind.startsWith("real_estate_")
        ? { ...item, verdict: "match" as const }
        : item,
    ),
  };
};

describe("부동산 투자 근거 기반 검토 규칙", () => {
  test("현재 희원감천과 v1 부동산 A의 상단 상태를 구분한다", async () => {
    const hiwon = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      REVIEWED_ON,
    );
    const legacy = await loadRealEstateInvestmentReview("real-estate-a", REVIEWED_ON);

    expect(hiwon).toMatchObject({
      sectionTitle: "근거 기반 검토 현황",
      evidenceSufficiency: "partial",
      confirmedIssue: "needs_follow_up",
    });
    expect(hiwon.priorityFindings.map((item) => item.id)).toEqual([
      "important-event-lease-termination-20260527",
      "exit-current-terms-open",
      "payout-formula",
    ]);
    expect(hiwon.confirmedIssue).not.toBe("critical_conflict");
    expect(legacy).toMatchObject({
      evidenceSufficiency: "insufficient",
      confirmedIssue: "not_assessed",
    });
    expect(legacy.areas.exit_terms).toContainEqual(
      expect.objectContaining({ id: "sale-asset-link-unknown", tone: "unknown" }),
    );
  });

  test("역할 이력은 provenance에 연결된 법인명과 한국어 역할명만 표시한다", async () => {
    const hiwon = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      REVIEWED_ON,
    );
    const sou = await loadRealEstateInvestmentReview(
      "real-estate-sou-daejeon-startup",
      REVIEWED_ON,
    );
    const hiwonText = JSON.stringify(hiwon.areas.role_history);
    const souText = JSON.stringify(sou.areas.role_history);

    for (const expected of [
      "세종디엑스 주식회사",
      "하나대체투자자산운용 주식회사",
      "부산은행",
      "플랫폼 운영",
      "펀드 운용",
      "신탁",
    ]) {
      expect(hiwonText).toContain(expected);
    }
    for (const expected of [
      "주식회사 루센트블록",
      "윙윙",
      "플랫폼 운영",
      "자산 관리",
    ]) {
      expect(souText).toContain(expected);
    }
    for (const internalId of [
      "bbric-operator-sejongdx",
      "hana-alternative-asset-management",
      "busan-bank",
      "lucentblock",
      "wingwing",
    ]) {
      expect(`${hiwonText}${souText}`).not.toContain(internalId);
    }
    expect(
      [...hiwon.areas.role_history, ...sou.areas.role_history].every(
        (item) => item.sources.length === 1 && item.sources[0]?.asOf,
      ),
    ).toBe(true);
  });

  test("역할 사건 issue는 해당 법인·역할 사건의 주의로만 표시한다", async () => {
    const structured = await withStructuredReview({ roles: "distinct" });
    if (structured.schemaVersion !== 2 || !structured.investmentReview) {
      throw new Error("역할 테스트 입력이 없습니다");
    }
    const manager = structured.investmentReview.roleHistory[0];
    if (!manager) throw new Error("운용 역할 테스트 입력이 없습니다");
    const source = structured.sources.find(
      (item) => item.url === manager.events[0]?.source,
    );
    if (!source) throw new Error("운용 역할 provenance가 없습니다");
    const offer = parseRealEstateOffer(
      {
        ...structured,
        investmentReview: {
          ...structured.investmentReview,
          roleHistory: [
            {
              ...manager,
              events: [
                {
                  ...manager.events[0],
                  eventOn: source.asOf,
                  outcome: "issue",
                },
              ],
            },
          ],
        },
      },
      "(역할 사건 주의 테스트)",
    );
    const review = reviewRealEstateInvestment({ offer, reviewedOn: REVIEWED_ON });

    expect(review.areas.role_history[0]).toMatchObject({
      tone: "attention",
      title: "테스트 법인 1 · 펀드 운용 사건 주의",
    });
    expect(review.areas.role_history[0]?.detail).toContain("해당 사건 원문");
    expect(review.areas.role_history[0]?.limitations[0]).toContain(
      "회사 전체 평가로 확장하지 않습니다",
    );
  });

  test("open gate와 next question은 고정 순서로 산출된다", async () => {
    const review = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      REVIEWED_ON,
    );

    expect(review.openGates.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "payout_cost_terms",
        "current_tradability",
        "sale_liquidation_terms",
      ]),
    );
    expect(review.nextQuestions).toEqual([
      "임대차 해지 후속 영향 확인 필요의 현재 영향을 확인했나요?",
      "배당 산식·비용 조건을 원문에서 확인할 수 있나요?",
      "현재 주문 가능·정지·종료 상태를 기준일 원문으로 확인할 수 있나요?",
      "매각·청산 조건과 현재 적용 여부를 직접 원문으로 확인할 수 있나요?",
      "운용·신탁·수탁·자산관리 역할을 서로 다른 직접 원문으로 식별할 수 있나요?",
      "현재 기준 중요 공시 전체를 직접 원문에서 확인했나요?",
    ]);
    expect(new Set(review.nextQuestions).size).toBe(review.nextQuestions.length);
  });

  test("정산 상품은 현재 거래 조건 대신 매각 공시값의 외부 확인 미완료를 우선한다", async () => {
    const review = await loadRealEstateInvestmentReview(
      "real-estate-sou-daejeon-startup",
      REVIEWED_ON,
    );

    expect(review.priorityFindings[0]).toMatchObject({
      id: "sale-asset-link-unknown",
      title: "매각 공시 기재값의 외부 동일물건 확인 미완료",
    });
    expect(review.priorityFindings.map((item) => item.id)).not.toContain(
      "exit-current-terms-open",
    );
  });

  test("offer와 report 또는 claim 대상이 다르면 평가를 차단한다", async () => {
    const { offer, report } = await loadHiwon();
    expect(() =>
      reviewRealEstateInvestment({
        offer,
        report: { ...report, offerId: "real-estate-a" },
        reviewedOn: REVIEWED_ON,
      }),
    ).toThrow(/offerId/);
    expect(() =>
      reviewRealEstateInvestment({
        offer,
        report: {
          ...report,
          judgements: report.judgements.map((item, index) =>
            index === 0
              ? { ...item, claim: { ...item.claim, subject: "다른 상품" } }
              : item,
          ),
        },
        reviewedOn: REVIEWED_ON,
      }),
    ).toThrow(/대상 연결/);
  });

  test("일부 BuildingHUB match만으로 comparable이 되지 않는다", async () => {
    const { offer, report } = await loadHiwon();
    const onlyAddress = report.judgements.filter(
      (item) => item.claim.kind === "real_estate_address",
    );
    const review = reviewRealEstateInvestment({
      offer,
      report: { ...report, judgements: onlyAddress },
      reviewedOn: REVIEWED_ON,
    });

    expect(review.evidenceSufficiency).not.toBe("comparable");
    expect(review.openGates.length).toBeGreaterThan(0);
  });

  test("confirmed와 unknown이 섞이면 none_found가 되지 않는다", async () => {
    const review = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      REVIEWED_ON,
    );

    expect(Object.values(review.areas).flat().some((item) => item.tone === "confirmed"))
      .toBe(true);
    expect(Object.values(review.areas).flat().some((item) => item.tone === "unknown"))
      .toBe(true);
    expect(review.confirmedIssue).not.toBe("none_found");
  });

  test("결측만 있는 partial 상품은 확인된 문제가 아니라 not_assessed다", async () => {
    const review = reviewRealEstateInvestment({
      offer: await withStructuredReview({ consistentPayout: true }),
      reviewedOn: REVIEWED_ON,
    });

    expect(review.evidenceSufficiency).toBe("partial");
    expect(review.confirmedIssue).toBe("not_assessed");
    expect(Object.values(review.areas).flat().some((item) => item.tone === "attention"))
      .toBe(false);
  });

  test("배당 총액은 표시 정밀도의 반올림 허용범위 안에서 코드가 검산한다", async () => {
    const { report } = await loadHiwon();
    const review = reviewRealEstateInvestment({
      offer: await withStructuredReview({ consistentPayout: true }),
      report,
      reviewedOn: REVIEWED_ON,
    });

    expect(review.areas.payout_cost).toContainEqual(
      expect.objectContaining({
        id: "payout-formula",
        tone: "confirmed",
        title: "배당 산식 검산 일치",
      }),
    );
  });

  test("other+수기 critical 입력은 schema가 허용하지 않는다", async () => {
    const { offer } = await loadHiwon();
    const source = offer.sources[0]!;
    expect(() =>
      parseRealEstateOffer(
        {
          ...offer,
          investmentReview: {
            importantEvents: [
              {
                kind: "other",
                exactProduct: true,
                directOriginal: true,
                eventOn: REVIEWED_ON,
                impact: "critical",
                source: source.url,
              },
            ],
          },
        },
        "(수기 critical 차단 테스트)",
      ),
    ).toThrow();
  });

  test("미래 중요 사건과 미래 시장 관측은 검토 기준일에서 차단한다", async () => {
    const { report } = await loadHiwon();
    const futureEvent = await withStructuredReview({
      includeEvent: true,
      eventOn: "2026-08-24",
    });
    const futureMarket = await withStructuredReview({ futureMarket: true });
    expect(() =>
      reviewRealEstateInvestment({
        offer: futureEvent,
        report,
        reviewedOn: REVIEWED_ON,
      }),
    ).toThrow(/미래/);
    expect(() =>
      reviewRealEstateInvestment({
        offer: futureMarket,
        report,
        reviewedOn: REVIEWED_ON,
      }),
    ).toThrow(/미래/);
  });

  test("동일 source를 역할에 복제해도 법적 역할 gate가 닫히지 않는다", async () => {
    const { report } = await loadHiwon();
    const review = reviewRealEstateInvestment({
      offer: await withStructuredReview({ roles: "duplicate" }),
      report,
      reviewedOn: REVIEWED_ON,
    });

    expect(review.openGates.map((item) => item.id)).toContain(
      "legal_role_identification",
    );
  });

  test("같은 법인의 겹치는 역할은 서로 다른 원문 연결이면 식별할 수 있다", async () => {
    const { report } = await loadHiwon();
    const structured = await withStructuredReview({ roles: "distinct" });
    if (structured.schemaVersion !== 2 || !structured.investmentReview) {
      throw new Error("역할 테스트 입력이 없습니다");
    }
    const offer = parseRealEstateOffer(
      {
        ...structured,
        investmentReview: {
          ...structured.investmentReview,
          roleHistory: structured.investmentReview.roleHistory.map((role) => ({
            ...role,
            entityId: "same-entity",
            legalName: "동일 법인",
          })),
        },
      },
      "(겹치는 역할 테스트)",
    );
    const review = reviewRealEstateInvestment({ offer, report, reviewedOn: REVIEWED_ON });

    expect(review.openGates.map((item) => item.id)).not.toContain(
      "legal_role_identification",
    );
  });

  test("임대차 해지 구조화 시 priority는 사건·exit·배당 순서이며 critical이 아니다", async () => {
    const { report } = await loadHiwon();
    const review = reviewRealEstateInvestment({
      offer: await withStructuredReview({ includeEvent: true }),
      report,
      reviewedOn: REVIEWED_ON,
    });

    expect(review.confirmedIssue).toBe("needs_follow_up");
    expect(review.priorityFindings.map((item) => item.id)).toEqual([
      "important-event-lease-termination-1",
      "exit-current-terms-open",
      "payout-formula",
    ]);
    expect(review.materialEvents).toHaveLength(1);
    expect(review.areas.role_history.every((item) => !item.id.startsWith("important-event")))
      .toBe(true);
  });

  test("동일 kind 중요 사건도 안정적인 순번 id를 가진다", async () => {
    const { report } = await loadHiwon();
    const structured = await withStructuredReview({ includeEvent: true });
    if (structured.schemaVersion !== 2 || !structured.investmentReview) {
      throw new Error("중요 사건 테스트 입력이 없습니다");
    }
    const [event] = structured.investmentReview.importantEvents;
    if (!event) throw new Error("중요 사건 테스트 입력이 없습니다");
    const offer = parseRealEstateOffer(
      {
        ...structured,
        investmentReview: {
          ...structured.investmentReview,
          importantEvents: [event, { ...event, eventId: "lease-termination-2" }],
        },
      },
      "(중요 사건 id 테스트)",
    );
    const review = reviewRealEstateInvestment({ offer, report, reviewedOn: REVIEWED_ON });

    expect(review.materialEvents.map((item) => item.id)).toEqual([
      "important-event-lease-termination-1",
      "important-event-lease-termination-2",
    ]);
  });

  test("공모 숫자가 맞아도 전용 terms source가 없으면 gate가 열린다", async () => {
    const review = reviewRealEstateInvestment({
      offer: await withStructuredReview({
        consistentPayout: true,
        offerTerms: false,
      }),
      reviewedOn: REVIEWED_ON,
    });

    expect(review.openGates.map((item) => item.id)).toContain("offer_arithmetic");
    expect(review.areas.payout_cost).toContainEqual(
      expect.objectContaining({ id: "offer-arithmetic", tone: "unknown" }),
    );
  });

  test("운영 상품 거래 상태와 중요 공시 확인은 기준일 현재여야 한다", async () => {
    const { report } = await loadHiwon();
    const currentOffer = await withStructuredReview({
      completeExit: true,
      disclosures: true,
    });
    if (currentOffer.schemaVersion !== 2) throw new Error("v2 테스트 입력이 아닙니다");
    const statusUrl = currentOffer.statusSources?.tradabilityStatus;
    const staleOffer = parseRealEstateOffer(
      {
        ...currentOffer,
        sources: currentOffer.sources.map((source) =>
          source.url === statusUrl ? { ...source, asOf: "2026-06-01" } : source,
        ),
        investmentReview: currentOffer.investmentReview
          ? {
              ...currentOffer.investmentReview,
              materialDisclosuresCheck: currentOffer.investmentReview.materialDisclosuresCheck
                ? {
                    ...currentOffer.investmentReview.materialDisclosuresCheck,
                    validThrough: "2026-08-22",
                  }
                : undefined,
            }
          : undefined,
      },
      "(current freshness 테스트)",
    );
    const review = reviewRealEstateInvestment({
      offer: staleOffer,
      report,
      reviewedOn: REVIEWED_ON,
    });

    expect(review.openGates.map((item) => item.id)).toEqual(
      expect.arrayContaining(["current_tradability", "current_material_disclosures"]),
    );
  });

  test("검토 기준일은 실제 ISO date만 허용한다", async () => {
    const { offer } = await loadHiwon();
    expect(() =>
      reviewRealEstateInvestment({ offer, reviewedOn: "2026-8-23" }),
    ).toThrow(/ISO date/);
    expect(() =>
      reviewRealEstateInvestment({ offer, reviewedOn: "2026-02-30" }),
    ).toThrow(/ISO date/);
  });

  test("사건 해소와 근거 개선은 이전 결과에 고정되지 않고 재계산된다", async () => {
    const report = await reportWithAllBuildingMatches();
    const open = reviewRealEstateInvestment({
      offer: await withStructuredReview({
        includeEvent: true,
        eventStatus: "open",
        completeExit: true,
        consistentPayout: true,
        roles: "distinct",
        disclosures: true,
      }),
      report,
      reviewedOn: REVIEWED_ON,
    });
    const resolved = reviewRealEstateInvestment({
      offer: await withStructuredReview({
        includeEvent: true,
        eventStatus: "resolved",
        completeExit: true,
        consistentPayout: true,
        roles: "distinct",
        disclosures: true,
      }),
      report,
      reviewedOn: REVIEWED_ON,
    });

    expect(open).toMatchObject({
      evidenceSufficiency: "comparable",
      confirmedIssue: "needs_follow_up",
    });
    expect(resolved).toMatchObject({
      evidenceSufficiency: "comparable",
      confirmedIssue: "none_found",
    });
  });

  test("MOLIT는 external observation이고 시장 context는 상단 축을 바꾸지 않는다", async () => {
    const { offer, report } = await loadHiwon();
    const withoutMarket = reviewRealEstateInvestment({
      offer,
      report,
      reviewedOn: REVIEWED_ON,
    });
    const withMarket = reviewRealEstateInvestment({
      offer: await withStructuredReview({ includeMarket: true }),
      report,
      reviewedOn: REVIEWED_ON,
    });
    const buildingSource = withoutMarket.areas.asset_identity
      .flatMap((item) => item.sources)
      .find((source) => source.url.includes("15134735"));

    expect(buildingSource?.sourceKind).toBe("external-observation");
    expect(withMarket.areas.market_context[0]).toMatchObject({
      tone: "context",
      title: "ECOS 시장 맥락",
    });
    expect(withMarket.evidenceSufficiency).toBe(withoutMarket.evidenceSufficiency);
    expect(withMarket.confirmedIssue).toBe(withoutMarket.confirmedIssue);
  });

  test("서버 출력은 민감 입력·원시 endpoint·금지 표현을 반환하지 않는다", async () => {
    const review = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      REVIEWED_ON,
    );
    const raw = JSON.stringify(review);

    for (const forbidden of [
      "651-1",
      "26380",
      "10800",
      "serviceKey",
      "RTMSDataSvcNrgTrade",
      "BldRgstHubService",
      "하나대체투자부산특구부동산투자신탁1호",
      "희원감천빌딩",
      "추천",
      "안전",
      "적정가",
      "미래수익",
    ]) {
      expect(raw).not.toContain(forbidden);
    }
    expect(
      Object.values(review.areas)
        .flat()
        .flatMap((item) => item.sources)
        .every((source) => /^https?:\/\//.test(source.url)),
    ).toBe(true);
    expect(review.priorityFindings).toHaveLength(3);
  });
});
