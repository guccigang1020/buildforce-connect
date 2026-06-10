import { chromium } from "playwright";
const REQ = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: "he-IL" });
const page = await ctx.newPage();
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "contractor.demo@buildforce.dev");
await page.fill('input[type="password"]', "Demo2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);
await page.goto(`http://localhost:8080/my-requests/${REQ}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /בחר כזוכה/ }).first().click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /אישור סופי/ }).first().click();
const t0 = Date.now();
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  const awardBtns = await page.getByRole("button", { name: /בחר כזוכה/ }).count();
  const winPanel = await page.getByText("הזכייה הושלמה").count();
  console.log(`t+${Math.round((Date.now() - t0) / 1000)}s: awardButtons=${awardBtns} winPanel=${winPanel}`);
  if (awardBtns === 0 && winPanel > 0) break;
}
await browser.close();
