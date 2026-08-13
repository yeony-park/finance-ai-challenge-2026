import { describe, expect, test } from "vitest";
import { enforceCitations } from "../rag/citations";

describe("출처 강제", () => {
  test("returns answer with citations for registered sources", () => {
    const draft = {
      text: "지급정지 후 3영업일 내 서면 피해구제를 신청해야 합니다.",
      sourceIds: ["fss-remedy-procedure"],
    };

    const answer = enforceCitations(draft);

    expect(answer.kind).toBe("answer");
    if (answer.kind === "answer") {
      expect(answer.citations[0].sourceId).toBe("fss-remedy-procedure");
      expect(answer.citations[0].url).toContain("fss.or.kr");
    }
  });

  test("demotes to abstain when no sources", () => {
    const answer = enforceCitations({ text: "그럴듯한 답", sourceIds: [] });
    expect(answer.kind).toBe("abstain");
  });

  test("demotes to abstain when any source is unregistered (poisoning defense)", () => {
    const answer = enforceCitations({
      text: "위조 문서 기반 답변",
      sourceIds: ["fss-remedy-procedure", "fake-internal-doc"],
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
});
