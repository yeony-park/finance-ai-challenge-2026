/**
 * 홈 — 데모 화면 목업 v2 (2026-08-10).
 * 아티팩트로 검증한 3화면 목업을 앱으로 이식했다. Phase 3 제품화 시 이 목업이
 * 실제 파이프라인(수집→추출→대조→판정)과 연결된 화면의 스펙 기준이 된다.
 * 기획 근거: .claude/prds/disclosure-verification.prd.md
 */
import { DemoApp } from "@/components/demo/DemoApp";

export default function Home() {
  return (
    <main>
      <DemoApp />
    </main>
  );
}
