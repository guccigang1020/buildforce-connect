// Full money-loop UI test: two corps bid → contractor sees savings → awards.
// Usage: node scripts/flow-money-loop.mjs <requestId>
import { chromium } from "playwright";

const REQ = process.argv[2];
if (!REQ) throw new Error("pass requestId");
const BASE = "http://localhost:8080";
const SHOTS = "/tmp/bf-shots";
const results = [];

const browser = await chromium.launch();

async function newSession() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  return { ctx, page, errors };
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
}

async function bid(email, price, workers, shotName) {
  const { ctx, page, errors } = await newSession();
  await login(page, email, "Demo2026!");
  await page.goto(`${BASE}/requests/${REQ}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Fill the bid form (price, workers, date)
  const priceInput = page.locator('input[type="number"]').first();
  await priceInput.fill(String(price));
  const workersInput = page.locator('input[type="number"]').nth(1);
  await workersInput.fill(String(workers));
  const dateInput = page.locator('input[type="date"]').first();
  const d = new Date();
  d.setDate(d.getDate() + 14);
  await dateInput.fill(d.toISOString().slice(0, 10));

  await page.screenshot({ path: `${SHOTS}/${shotName}-form.png` });

  // Submit
  const submitBtn = page.getByRole("button", { name: /הגש|שלח/ }).first();
  await submitBtn.click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/${shotName}-after.png` });

  results.push({
    step: `bid ${email} @₪${price}`,
    url: page.url(),
    errors: errors.slice(0, 5),
  });
  await ctx.close();
}

// ── Corp 1 bids ₪185, Corp 2 bids ₪220 ──
await bid("corp.demo@buildforce.dev", 185, 10, "flow-bid1");
await bid("demo.corp.beta@gmail.com", 220, 10, "flow-bid2");

// ── Contractor reviews + awards ──
{
  const { ctx, page, errors } = await newSession();
  await login(page, "contractor.demo@buildforce.dev", "Demo2026!");
  await page.goto(`${BASE}/my-requests/${REQ}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/flow-offers.png`, fullPage: true });

  // Award the winning (cheapest) offer
  const awardBtn = page.getByRole("button", { name: /בחר כזוכה/ }).first();
  if (await awardBtn.count()) {
    await awardBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/flow-award-dialog.png` });
    const confirmBtn = page.getByRole("button", { name: /אישור סופי/ }).first();
    if (await confirmBtn.count()) {
      await confirmBtn.click();
      await page.waitForTimeout(3500);
    }
    await page.screenshot({ path: `${SHOTS}/flow-awarded.png`, fullPage: true });
    results.push({ step: "award", url: page.url(), errors: errors.slice(0, 5) });
  } else {
    results.push({ step: "award", url: page.url(), errors: ["NO award button found", ...errors.slice(0, 4)] });
  }
  await ctx.close();
}

// ── Loser corp sees rejected state ──
{
  const { ctx, page, errors } = await newSession();
  await login(page, "demo.corp.beta@gmail.com", "Demo2026!");
  await page.goto(`${BASE}/corporation-dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/flow-loser-dash.png` });
  results.push({ step: "loser view", url: page.url(), errors: errors.slice(0, 5) });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
