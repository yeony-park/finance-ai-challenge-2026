import { chromium } from "playwright";

const OUT = process.argv[2];
const targets = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "methodology", url: "http://localhost:3000/methodology" },
  { name: "notfound", url: "http://localhost:3000/offers/bankcow-9" },
];
const sizes = [
  { label: "320", width: 320, height: 720 },
  { label: "768", width: 768, height: 900 },
  { label: "1024", width: 1024, height: 900 },
  { label: "1440", width: 1440, height: 950 },
];

const browser = await chromium.launch();
for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const t of targets) {
    await page.goto(t.url, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 6)
        .map((el) => `${el.tagName}.${el.className}`.slice(0, 90)),
    }));
    const overflow = m.scrollW > m.clientW + 1;
    console.log(`${size.label.padEnd(5)} ${t.name.padEnd(12)} scrollW=${m.scrollW} clientW=${m.clientW} ${overflow ? "OVERFLOW " + JSON.stringify(m.offenders) : "ok"}`);
    if (["320", "1440"].includes(size.label) && t.name !== "notfound") {
      await page.screenshot({ path: `${OUT}/${t.name}-${size.label}.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
