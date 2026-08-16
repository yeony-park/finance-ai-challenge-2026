import type { Verdict } from "@/lib/verify/types";

export const VERDICT_CAPTIONS: Readonly<Record<Verdict, string>> = {
  match: "공시에 적힌 내용이 공적 원장의 기록과 같았다는 뜻입니다",
  mismatch: "공시에 적힌 내용이 공적 원장의 기록과 달랐다는 뜻입니다",
  unverifiable:
    "틀렸다는 뜻이 아니라, 대조할 공적 원장 자료가 없었다는 뜻입니다",
};
