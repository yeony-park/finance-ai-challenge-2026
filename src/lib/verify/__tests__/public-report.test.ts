/**
 * 공개 리포트(커밋·배포 대상)의 개인정보 부재를 강제하는 테스트.
 *
 * 두 층으로 검사한다.
 * 1) 구조 검사 — 로컬 데이터 없이도 항상 돈다(신규 클론·CI)
 * 2) 실측 대조 — 로컬 스냅샷이 있을 때만, 스냅샷의 실명·상세주소가 공개본에 없는지 확인
 *    (실명을 테스트 코드에 복사하지 않기 위해 이 방향으로 검사한다)
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { maskSubject, toPublicReport } from "../report/public-report";
import { parseReportSnapshot, type ReportSnapshot } from "../report/snapshot";
import { hasLocalFile, SNAPSHOT_PATH, skipReason } from "./local-data";

const PUBLIC_DIR = "data/public/livestock-9";

const readPublicReports = (): readonly { name: string; raw: string }[] =>
  readdirSync(PUBLIC_DIR)
    .filter((name) => /^report-.*\.json$/.test(name))
    .map((name) => ({
      name,
      raw: readFileSync(`${PUBLIC_DIR}/${name}`, "utf8"),
    }));

describe("공개 리포트 — 개인정보 부재 (구조 검사)", () => {
  test("커밋된 공개 리포트가 최소 1건 있고 엔진 계약을 만족한다", () => {
    // Act
    const reports = readPublicReports();

    // Assert
    expect(reports.length).toBeGreaterThan(0);
    for (const { raw } of reports) {
      const parsed = parseReportSnapshot(JSON.parse(raw));
      expect(parsed.bySubject.length).toBeGreaterThan(0);
      expect(parsed.judgements.every((j) => j.evidence.length >= 1)).toBe(true);
    }
  });

  test("9자리 이상 숫자 연속은 공시 접수번호(공개 식별자) 외에 존재하지 않는다", () => {
    for (const { name, raw } of readPublicReports()) {
      const report: ReportSnapshot = parseReportSnapshot(JSON.parse(raw));
      const longDigits = new Set(raw.match(/\d{9,}/g) ?? []);
      expect(
        [...longDigits].filter((digits) => digits !== report.document.rcpNo),
        `${name}: 이력번호·농장 식별자로 보이는 숫자열이 남아 있습니다`,
      ).toEqual([]);
    }
  });

  test("도로명 상세주소·번지·농장번호 원문이 남지 않는다", () => {
    for (const { name, raw } of readPublicReports()) {
      for (const pattern of [
        /[가-힣]+로\d+번길/, // 도로명 + 건물번호
        /번지/,
        /농장번호\s*\d/,
        /[가-힣]{2,}(시|군|구|읍|면|동)(?![가-힣])/, // 마스킹되지 않은 지명 토큰
      ]) {
        expect(pattern.test(raw), `${name}: ${pattern} 가 남아 있습니다`).toBe(
          false,
        );
      }
    }
  });

  test("발행사가 붙인 개체명은 번호만 남는다", () => {
    for (const { raw } of readPublicReports()) {
      const report: ReportSnapshot = parseReportSnapshot(JSON.parse(raw));
      for (const head of report.bySubject) {
        expect(head.subject).toMatch(/^개체 \d+호$/);
      }
      for (const judgement of report.judgements) {
        expect(judgement.claim.subject).toMatch(/^개체 \d+호$/);
        expect(judgement.claim.id).toMatch(/^[a-z_]+:개체 \d+호$/);
      }
    }
  });
});

describe("toPublicReport — 순수 변환 계약", () => {
  const synthetic: ReportSnapshot = {
    offerId: "livestock-9",
    document: {
      offerId: "livestock-9",
      rcpNo: "20260806000159",
      submittedOn: "2026-08-06",
    },
    generatedAt: "2026-08-12T00:00:00.000Z",
    mode: "fake",
    sources: ["축산물이력제 개체정보"],
    summary: { total: 1, match: 0, mismatch: 1, unverifiable: 0 },
    bySubject: [{ subject: "검증 7호", verdict: "mismatch", judgementCount: 1 }],
    judgements: [
      {
        verdict: "mismatch",
        claim: {
          id: "custody_location:검증 7호",
          kind: "custody_location",
          subject: "검증 7호",
          field: "보관장소",
          value: "충청북도 검증시 가상읍",
          document: {
            offerId: "livestock-9",
            rcpNo: "20260806000159",
            submittedOn: "2026-08-06",
          },
          location: { section: "8", table: "개체 명세표", row: 7 },
          verifiability: "verifiable",
        },
        evidence: [
          {
            sourceId: "livestock-trace",
            sourceName: "축산물이력제",
            url: "http://example.test/trace?traceNo=002212786152",
            observedAt: "2026-08-10T01:40:38.382Z",
            field: "보관장소",
            claimed: "충청북도 검증시 가상읍",
            observed:
              "경상북도 가상시 남구 합성읍 가상로1234번길 (전산등록 20260105, 농장번호 387221) 김검증",
            stance: "contradicts",
            note: "불일치 토큰: 검증시, 가상읍",
          },
        ],
        rationale:
          "공적 원장의 최종 사육지에서 신고서 보관장소(검증시 가상읍)가 확인되지 않습니다.",
      },
    ],
    unjudged: [
      {
        claim: {
          id: "acquisition_price:검증 7호",
          kind: "acquisition_price",
          subject: "검증 7호",
          field: "취득원가",
          value: "4574865",
          numericValue: 4574865,
          unit: "원",
          document: {
            offerId: "livestock-9",
            rcpNo: "20260806000159",
            submittedOn: "2026-08-06",
          },
          location: { section: "8", table: "개체 명세표", row: 7 },
          verifiability: "verifiable",
        },
        reason: "검증 7호의 취득원가를 대조할 어댑터가 없습니다.",
      },
    ],
    notes: ["확인 불가 강등: acquisition_price:검증 7호 — 사유"],
  };

  test("농장주 실명·상세주소·농장번호는 시·군 단위 마스킹으로 사라진다", () => {
    // Act
    const published = toPublicReport(synthetic);
    const serialized = JSON.stringify(published);

    // Assert
    expect(published.judgements[0]?.evidence[0]?.observed).toBe("경북 ○○시");
    for (const secret of ["김검증", "가상로1234번길", "387221", "가상시"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test("개체명은 자유 문장·claim id·롤업 전부에서 같은 표기로 바뀐다", () => {
    const published = toPublicReport(synthetic);

    expect(published.bySubject[0]?.subject).toBe("개체 7호");
    expect(published.judgements[0]?.claim.id).toBe("custody_location:개체 7호");
    expect(published.unjudged[0]?.reason).toContain("개체 7호");
    expect(published.notes[0]).toContain("acquisition_price:개체 7호");
    expect(JSON.stringify(published)).not.toContain("검증 7호");
  });

  test("판정·집계·근거 구조는 그대로 보존된다 (공개본만으로 재현 가능)", () => {
    const published = toPublicReport(synthetic);

    expect(published.summary).toEqual(synthetic.summary);
    expect(published.judgements[0]?.verdict).toBe("mismatch");
    expect(published.judgements[0]?.evidence[0]?.stance).toBe("contradicts");
    expect(published.judgements[0]?.claim.location).toEqual({
      section: "8",
      table: "개체 명세표",
      row: 7,
    });
    expect(published.unjudged[0]?.claim.numericValue).toBe(4574865);
  });

  test("두 번 적용해도 결과가 같다 (멱등)", () => {
    const once = toPublicReport(synthetic);
    expect(toPublicReport(once)).toEqual(once);
  });

  test("maskSubject는 번호를 못 읽으면 순번으로 대체한다", () => {
    expect(maskSubject("학산 24호", 1)).toBe("개체 24호");
    expect(maskSubject("이름없음", 5)).toBe("개체 5호");
  });
});

describe.skipIf(!hasLocalFile(SNAPSHOT_PATH))(
  `공개 리포트 — 실측 스냅샷 대조 ${hasLocalFile(SNAPSHOT_PATH) ? "" : skipReason(SNAPSHOT_PATH)}`,
  () => {
    test("스냅샷의 농장주 실명·상세주소가 공개 리포트에 없다", () => {
      // Arrange — 실명 목록은 로컬 스냅샷에서만 읽는다(테스트 코드에 복사 금지)
      const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as {
        verdicts?: readonly {
          farmHistory?: readonly {
            farmerNm?: string;
            farmAddr?: string;
            farmNo?: string;
          }[];
        }[];
      };
      const secrets = new Set<string>();
      for (const verdict of snapshot.verdicts ?? []) {
        for (const farm of verdict.farmHistory ?? []) {
          if (farm.farmerNm) secrets.add(farm.farmerNm);
          if (farm.farmNo) secrets.add(farm.farmNo);
          for (const token of (farm.farmAddr ?? "").split(/\s+/)) {
            if (token.length >= 2) secrets.add(token);
          }
        }
      }
      expect(secrets.size).toBeGreaterThan(0);

      // Act + Assert
      for (const { name, raw } of readPublicReports()) {
        const leaked = [...secrets].filter((secret) => raw.includes(secret));
        expect(leaked, `${name} 에 실측 개인정보가 남아 있습니다`).toEqual([]);
      }
    });
  },
);
