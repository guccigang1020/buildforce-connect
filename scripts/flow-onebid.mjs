import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: "he-IL" });
const page = await ctx.newPage();

// login as corp
await page.goto("http://localhost:8080/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "corp.demo@buildforce.dev");
await page.fill('input[type="password"]', "Demo2026!");
await page.click('button[type="submit"]');
await page.waitForTimeout(4500);

// open tenders → first open tender bid dialog
await page.goto("http://localhost:8080/corporation-dashboard", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const bidBtn = page.getByRole("button", { name: /הגש הצעה|הגש/ }).first();
await bidBtn.click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/bf-shots/onebid-form.png" });

// fields present? (should NOT find the removed ones)
const removed = await page.getByText(/זמן תגובה|אחריות \(ימים\)|כלול ביטוח/).count();
const dateInput = await page.locator('input[type="date"]').count();
console.log(`removed-fields visible: ${removed} (want 0) | date inputs: ${dateInput} (want 1)`);

// fill + submit bid #1
await page.locator('input[id="price"]').fill("199");
await page.locator('input[id="workers"]').fill("5");
const d = new Date(); d.setDate(d.getDate() + 10);
await page.locator('input[id="sd"]').fill(d.toISOString().slice(0, 10));
await page.getByRole("button", { name: /שלח הצעה סגורה/ }).click();
await page.waitForTimeout(3500);
const ok1 = await page.getByText("ההצעה נשלחה בהצלחה").count();
console.log(`bid #1 submitted: ${ok1 > 0}`);

// try bid #2 on the same tender
await page.goto("http://localhost:8080/corporation-dashboard", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const bidBtn2 = page.getByRole("button", { name: /הגש הצעה|הגש/ }).first();
if (await bidBtn2.count()) {
  await bidBtn2.click();
  await page.waitForTimeout(800);
  const dlg = await page.locator('input[id="price"]').count();
  if (dlg) {
    await page.locator('input[id="price"]').fill("180");
    await page.locator('input[id="workers"]').fill("5");
    await page.locator('input[id="sd"]').fill(d.toISOString().slice(0, 10));
    await page.getByRole("button", { name: /שלח הצעה סגורה/ }).click();
    await page.waitForTimeout(3500);
    const blocked = await page.getByText(/כבר הגשת הצעה למכרז זה/).count();
    console.log(`bid #2 blocked with Hebrew error: ${blocked > 0}`);
    await page.screenshot({ path: "/tmp/bf-shots/onebid-blocked.png" });
  } else {
    console.log("bid #2: dialog did not open (button state)");
  }
} else {
  console.log("bid #2: no bid button (tender hidden after bidding — also acceptable)");
}
await browser.close();
