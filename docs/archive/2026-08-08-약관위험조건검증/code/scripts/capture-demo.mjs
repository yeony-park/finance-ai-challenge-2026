import { chromium } from "playwright";

const OUT = process.env.OUT_DIR ?? "/mnt/hgfs/Windows";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("select"); // 상품 목록 로드 대기
await page.screenshot({ path: `${OUT}/약관검증-01-초기화면.png`, fullPage: true });

// 3탭 선택 → 분석 (불리 변형 시연 상품)
await page.selectOption("select >> nth=0", { label: "든든손해보험(가상)" });
await page.selectOption("select >> nth=1", { label: "암보험" });
await page.selectOption("select >> nth=2", { label: "(무)든든 암보험 2504 (시연용 가상 약관)" });
await page.click("button:has-text('약관 분석')");
await page.waitForSelector("text=등급 산정 기준 보기", { timeout: 15000 });

// 접이식 요소를 모두 펼쳐 전체 정보가 보이게
for (const summary of await page.locator("summary").all()) {
  await summary.click();
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/약관검증-02-분석결과-펼침.png`, fullPage: true });

// 모바일 뷰포트 (심사 요건: 모바일 웹)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/약관검증-03-모바일.png`, fullPage: true });

// 주의 등급 시연 상품 (단일 근거 계열 — 3단계 등급 완성)
await page.setViewportSize({ width: 1280, height: 900 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("select");
await page.selectOption("select >> nth=0", { label: "한결생명(가상)" });
await page.selectOption("select >> nth=1", { label: "종신보험" });
await page.selectOption("select >> nth=2", {
  label: "(무)한결 종신보험 2503 (시연용 가상 약관)",
});
await page.click("button:has-text('약관 분석')");
await page.waitForSelector("text=등급 산정 기준 보기", { timeout: 15000 });
for (const summary of await page.locator("summary").all()) {
  await summary.click();
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/약관검증-04-주의등급.png`, fullPage: true });

await browser.close();
console.log("saved to", OUT);
