import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "he-IL" });
const page = await ctx.newPage();
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@buildforce.dev");
await page.fill('input[type="password"]', "BuildForce-Admin-2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);
await page.getByRole("button", { name: /מכרזים והצעות/ }).click();
await page.waitForTimeout(2000);
// expand the request with 3 offers (הרצליה BF-1808)
await page.locator("button").filter({ hasText: "3 הצעות" }).first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/bf-shots/admin-expanded.png" });
await browser.close();
