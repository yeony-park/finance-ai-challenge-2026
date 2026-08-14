import { describe, expect, test } from "vitest";
import { enforceCitations } from "../rag/citations";
import { officialChannels } from "../rag/corpus";

describe("출처 강제", () => {
  test("returns answer with citations for registered sources", () => {
    const draft = {
      text: "개체 이력번호를 축산물이력제 조회 결과와 대조합니다.",
      sourceIds: ["livestock-trace"],
    };

    const answer = enforceCitations(draft);

    expect(answer.kind).toBe("answer");
    if (answer.kind === "answer") {
      expect(answer.citations[0].sourceId).toBe("livestock-trace");
      expect(answer.citations[0].url).toContain("mtrace.go.kr");
    }
  });

  test("demotes to abstain when no sources", () => {
    const answer = enforceCitations({ text: "그럴듯한 답", sourceIds: [] });
    expect(answer.kind).toBe("abstain");
  });

  test("demotes to abstain when any source is unregistered (poisoning defense)", () => {
    const answer = enforceCitations({
      text: "발행사 내부 자료 기반 답변",
      sourceIds: ["livestock-trace", "issuer-internal-doc"],
    });
    expect(answer.kind).toBe("abstain");
  });

  test("abstain includes official channels for the user", () => {
    const answer = enforceCitations({ text: "", sourceIds: [] });
    if (answer.kind === "abstain") {
      expect(answer.officialChannels.length).toBeGreaterThan(0);
    } else {
      throw new Error("expected abstain");
    }
  });

  test("official channels exclude the service's own methodology page", () => {
    const ids = officialChannels().map((channel) => channel.sourceId);
    expect(ids).not.toContain("verification-methodology");
    expect(ids).toContain("dart-viewer");
  });
});
