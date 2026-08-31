import { describe, expect, test } from "vitest";

import {
  parseArgs as parseMonitorArgs,
  runDetection,
  targetsFor,
} from "../amend/monitor-cli";
import { parseArgs as parseVerifyArgs } from "../cli";
import {
  loadReplayLineage,
  parseArgs as parseReplayArgs,
  writeReplayOutputs,
} from "../amend/actual-replay-cli";
import {
  parseArgs as parseNarrativeArgs,
  runNarrativeCli,
} from "../narrative/cli";

describe("verification CLI catalog policy", () => {
  test("verify CLI는 명시한 active RCP만 adapter·write 단계로 넘긴다", () => {
    expect(() => parseVerifyArgs([])).toThrow("--rcpNo");
    expect(() => parseVerifyArgs(["--rcpNo", "20260806000159"])).toThrow("active RCP");
    expect(parseVerifyArgs(["--rcpNo", "20260814003572", "--fake"])).toMatchObject({
      rcpNo: "20260814003572",
      forceFake: true,
    });
  });

  test("actual replay는 상품과 해당 상품의 base RCP를 모두 명시해야 한다", () => {
    expect(() => parseReplayArgs([])).toThrow("--offer");
    expect(() => parseReplayArgs(["--offer", "livestock-9"])).toThrow("--base-rcp-no");
    expect(() => parseReplayArgs([
      "--offer", "livestock-8", "--base-rcp-no", "20260806000159",
    ])).toThrow("후보 RCP가 아닙니다");
    expect(() => parseReplayArgs([
      "--offer", "livestock-99", "--base-rcp-no", "20260806000159",
    ])).toThrow("onboarding catalog");
    expect(() => parseReplayArgs([
      "--offer", "livestock-9", "--base-rcp-no", "20990101000000",
    ])).toThrow("후보 RCP가 아닙니다");
    expect(parseReplayArgs([
      "--offer", "livestock-9", "--base-rcp-no", "20260806000159",
    ])).toMatchObject({
      offerId: "livestock-9",
      baseRcpNo: "20260806000159",
      write: true,
    });
    expect(() => parseReplayArgs([
      "--offer", "livestock-7", "--base-rcp-no", "20260203000427",
    ])).toThrow("--no-write");
    expect(parseReplayArgs([
      "--offer", "livestock-7", "--base-rcp-no", "20260203000427", "--no-write",
    ])).toMatchObject({
      offerId: "livestock-7",
      baseRcpNo: "20260203000427",
      write: false,
    });
  });

  test("actual replay는 검증된 명시 base RCP만 주입 fetcher에 전달한다", async () => {
    const calls: Array<{ rcpNo: string; apiKey: string }> = [];
    const options = parseReplayArgs([
      "--offer", "livestock-9", "--base-rcp-no", "20260806000159",
    ]);
    const lineage = await loadReplayLineage(options, "test-key", async (rcpNo, apiKey) => {
      calls.push({ rcpNo, apiKey });
      return {
        baseRcpNo: rcpNo,
        baseReportName: "투자계약증권 증권신고서",
        baseReceivedOn: "20260806",
        checkedThrough: "2026-09-01",
        amendments: [],
        sourceName: "test",
        notes: [],
      };
    });

    expect(calls).toEqual([{ rcpNo: "20260806000159", apiKey: "test-key" }]);
    expect(lineage.baseRcpNo).toBe("20260806000159");
  });

  test("pending replay는 default write에서 loader를 호출하지 않고 no-write만 허용한다", async () => {
    let calls = 0;
    const fetcher = async (rcpNo: string) => {
      calls += 1;
      return {
        baseRcpNo: rcpNo,
        baseReportName: "투자계약증권 증권신고서",
        baseReceivedOn: "20260203",
        checkedThrough: "2026-09-01",
        amendments: [],
        sourceName: "test",
        notes: [],
      };
    };

    await expect(loadReplayLineage(
      { offerId: "livestock-7", baseRcpNo: "20260203000427", write: true },
      "test-key",
      fetcher,
    )).rejects.toThrow("ready-local");
    expect(calls).toBe(0);

    await expect(loadReplayLineage(
      { offerId: "livestock-7", baseRcpNo: "20260203000427", write: false },
      "test-key",
      fetcher,
    )).resolves.toMatchObject({ baseRcpNo: "20260203000427" });
    expect(calls).toBe(1);
  });

  test("ready replay는 after document가 active RCP와 일치할 때만 기록한다", async () => {
    let writes = 0;
    const writer = async () => {
      writes += 1;
      return "written";
    };
    const options = { offerId: "livestock-9", write: true } as const;

    await expect(writeReplayOutputs(options, {
      document: {
        offerId: "livestock-9",
        rcpNo: "20260806000159",
        submittedOn: "2026-08-06",
      },
    }, writer)).rejects.toThrow("active RCP");
    expect(writes).toBe(0);

    await expect(writeReplayOutputs(options, {
      document: {
        offerId: "livestock-9",
        rcpNo: "20260814003572",
        submittedOn: "2026-08-14",
      },
    }, writer)).resolves.toBe("written");
    expect(writes).toBe(1);
  });

  test("narrative는 active cattle만 후보로 삼되 외부 AI 미승인이면 provider 0회다", async () => {
    const options = parseNarrativeArgs([]);
    expect(options.offerIds).toEqual(["livestock-9"]);
    expect(parseNarrativeArgs(["--offer", "livestock-1"]).offerIds).toEqual([]);

    let providers = 0;
    await runNarrativeCli(options, async () => {
      providers += 1;
      throw new Error("호출되면 안 됩니다");
    });
    expect(providers).toBe(0);
  });

  test("monitor는 pending cattle을 fetch·write 대상에서 제외한다", async () => {
    const options = parseMonitorArgs(["--offer", "livestock-1"]);
    expect(targetsFor(options)).toEqual([]);
    let fetches = 0;
    let writes = 0;
    await runDetection(options, {
      fetchLineage: async () => {
        fetches += 1;
        throw new Error("호출되면 안 됩니다");
      },
      writeState: async () => {
        writes += 1;
        return "written";
      },
    });
    expect({ fetches, writes }).toEqual({ fetches: 0, writes: 0 });
  });
});
