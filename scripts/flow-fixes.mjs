import { chromium } from "playwright";
const browser = await chromium.launch();
const log = [];

async function sess(email, pw) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: "he-IL" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => m.type()==="error" && errs.push(m.text().slice(0,100)));
  page.on("pageerror", e => errs.push("PE: "+e.message.slice(0,100)));
  await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4500);
  return { ctx, page, errs };
}

// ===== CORP: dedup + withdraw + restricted tender view =====
{
  const { ctx, page, errs } = await sess("corp.demo@buildforce.dev", "Demo2026!");
  await page.goto("http://localhost:8080/corporation-dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // price intelligence gone?
  const priceIntel = await page.getByText("ניתוח תמחור").count();
  log.push(`[corp] ניתוח תמחור present: ${priceIntel} (want 0)`);

  // count open tenders + my-offers rows; the request_ids in open should NOT appear in my-offers
  const openIds = await page.locator("text=מכרזים פתוחים").count();
  log.push(`[corp] open-tenders section present: ${openIds>0}`);

  // submit a bid on first open tender, then verify it leaves open-tenders
  const bidBtns = page.getByRole("button", { name: /^הגש הצעה$|^הגש$/ });
  const beforeCount = await bidBtns.count();
  if (beforeCount > 0) {
    await bidBtns.first().click();
    await page.waitForTimeout(800);
    await page.locator('input[id="price"]').fill("177");
    await page.locator('input[id="workers"]').fill("4");
    const d = new Date(); d.setDate(d.getDate()+9);
    await page.locator('input[id="sd"]').fill(d.toISOString().slice(0,10));
    await page.getByRole("button", { name: /שלח הצעה סגורה/ }).click();
    await page.waitForTimeout(3500);
    const afterCount = await page.getByRole("button", { name: /^הגש הצעה$|^הגש$/ }).count();
    log.push(`[corp] open bid buttons: ${beforeCount} -> ${afterCount} after bidding (tender left open list)`);
  } else {
    log.push(`[corp] no open tender to bid on (all already bid) — skipping`);
  }

  // withdraw flow: find a submitted offer, click withdraw -> confirm
  await page.goto("http://localhost:8080/corporation-dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const withdrawBtn = page.locator('button[title="משוך הצעה"]').first();
  if (await withdrawBtn.count()) {
    const openBefore = await page.getByRole("button", { name: /^הגש הצעה$|^הגש$/ }).count();
    await withdrawBtn.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^כן, משוך$|^משוך$/ }).first().click();
    await page.waitForTimeout(3500);
    const openAfter = await page.getByRole("button", { name: /^הגש הצעה$|^הגש$/ }).count();
    log.push(`[corp] withdraw worked: open bid buttons ${openBefore} -> ${openAfter} (tender returned)`);
  } else {
    log.push(`[corp] no submitted offer to withdraw`);
  }

  // restricted tender view: open a tender via eye — should NOT show competition/offer counts
  await page.goto("http://localhost:8080/requests/237dda8f-ef20-4793-90b2-2c3bd09fb21b", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const compWords = await page.getByText(/הצעות · |סטטוס הצעות|חמה מאוד|אנונימיות מלאה/).count();
  log.push(`[corp] tender view competition/offer-count words: ${compWords} (want 0)`);
  await page.screenshot({ path: "/tmp/bf-shots/fix-corp-tender.png" });
  log.push(`[corp] console errors: ${[...new Set(errs)].slice(0,3).join(" | ") || "none"}`);
  await ctx.close();
}

// ===== ADMIN: bids oversight =====
{
  const { ctx, page, errs } = await sess("admin@buildforce.dev", "BuildForce-Admin-2026!");
  await page.waitForTimeout(1500);
  // switch to auctions view
  await page.getByRole("button", { name: /מכרזים והצעות/ }).click();
  await page.waitForTimeout(2500);
  const reqCards = await page.locator("text=/הצעות$/").count();
  log.push(`[admin] auctions view request rows: ${reqCards}`);
  // expand first request, expect corp names + prices
  const firstRow = page.locator("button").filter({ hasText: "הצעות" }).first();
  await firstRow.click();
  await page.waitForTimeout(1200);
  const corpTable = await page.getByText(/תאגיד/).count();
  log.push(`[admin] expanded request shows offers table: ${corpTable>0}`);
  await page.screenshot({ path: "/tmp/bf-shots/fix-admin-auctions.png", fullPage: true });
  // verify פעולות tab is gone
  const activityTab = await page.getByText("פעולות", { exact: true }).count();
  log.push(`[admin] old פעולות tab present: ${activityTab} (want 0)`);
  log.push(`[admin] console errors: ${[...new Set(errs)].slice(0,3).join(" | ") || "none"}`);
  await ctx.close();
}

await browser.close();
console.log(log.join("\n"));
