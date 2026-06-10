import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1600 }, locale: "he-IL" });
const page = await ctx.newPage();
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "contractor.demo@buildforce.dev");
await page.fill('input[type="password"]', "Demo2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);
await page.goto("http://localhost:8080/my-requests/95ba9e1b-943c-4a7e-9f02-82d2cf38f700", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
// scroll the inner main container to the bottom (offers/winner section)
await page.evaluate(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTop = main.scrollHeight;
});
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/bf-shots/flow-winner-section.png" });
await browser.close();
console.log("done");
