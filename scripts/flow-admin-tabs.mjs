import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: "he-IL" });
const page = await ctx.newPage();
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@buildforce.dev");
await page.fill('input[type="password"]', "BuildForce-Admin-2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/bf-shots/admin-pending.png" });
const pendingRows = await page.locator("tbody tr").count();
const contractorChips = await page.locator("tbody").getByText("קבלן", { exact: true }).count();
console.log(`pending tab rows: ${pendingRows} | contractor chips in queue: ${contractorChips} (want 0)`);

// switch to approved tab
await page.getByRole("tab", { name: /מאושרים/ }).click();
await page.waitForTimeout(1200);
const approvedRows = await page.locator("tbody tr").count();
await page.screenshot({ path: "/tmp/bf-shots/admin-approved.png" });
console.log(`approved tab rows: ${approvedRows}`);

// all tab
await page.getByRole("tab", { name: /כל התאגידים/ }).click();
await page.waitForTimeout(1200);
const allRows = await page.locator("tbody tr").count();
console.log(`all-corps tab rows: ${allRows}`);
await browser.close();
