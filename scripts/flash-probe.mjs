import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
const page = await ctx.newPage();
// Capture frames during load
const shots = [];
const start = Date.now();
page.goto("http://localhost:8080/", { waitUntil: "commit" });
for (let i = 0; i < 8; i++) {
  await page.screenshot({ path: `/tmp/bf-shots/flash-${i}.png` });
  shots.push(`flash-${i} @ +${Date.now()-start}ms`);
  await page.waitForTimeout(120);
}
console.log(shots.join("\n"));
// Also: check if body has a background before CSS loads
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log("final body bg:", bg);
await browser.close();
