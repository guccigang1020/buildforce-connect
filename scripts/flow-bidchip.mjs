import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: "he-IL" });
const page = await ctx.newPage();
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "corp.demo@buildforce.dev");
await page.fill('input[type="password"]', "Demo2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(4500);
await page.goto("http://localhost:8080/corporation-dashboard", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const chipsBefore = await page.getByText("הוגשה הצעה").count();
const bidButtons = await page.getByRole("button", { name: /הגש הצעה|^הגש$/ }).count();
console.log(`before new bid: submitted-chips=${chipsBefore}, active bid buttons=${bidButtons}`);

if (bidButtons > 0) {
  await page.getByRole("button", { name: /הגש הצעה|^הגש$/ }).first().click();
  await page.waitForTimeout(800);
  await page.locator('input[id="price"]').fill("210");
  await page.locator('input[id="workers"]').fill("4");
  const d = new Date(); d.setDate(d.getDate() + 12);
  await page.locator('input[id="sd"]').fill(d.toISOString().slice(0, 10));
  await page.getByRole("button", { name: /שלח הצעה סגורה/ }).click();
  await page.waitForTimeout(3500);
  const chipsAfter = await page.getByText("הוגשה הצעה").count();
  const buttonsAfter = await page.getByRole("button", { name: /הגש הצעה|^הגש$/ }).count();
  console.log(`after new bid: submitted-chips=${chipsAfter} (want ${chipsBefore + 1}), bid buttons=${buttonsAfter} (want ${bidButtons - 1})`);
  await page.screenshot({ path: "/tmp/bf-shots/bidchip.png" });
}
await browser.close();
