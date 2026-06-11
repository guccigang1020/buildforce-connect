import { chromium } from "playwright";
const BASE = "http://localhost:8080";
const browser = await chromium.launch();
const out = [];

// 1. Logged-out landing CTA goes to /signup (not error toast)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /פרסם בקשת כוח אדם/ }).first().click();
  await page.waitForTimeout(1500);
  out.push({ check: "logged-out hero CTA", url: page.url(), pass: page.url().includes("/signup") });
  await ctx.close();
}

// 2. Admin login → lands directly on /admin (no dashboard flash)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  const visited = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && visited.push(new URL(f.url()).pathname));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@buildforce.dev");
  await page.fill('input[type="password"]', "BuildForce-Admin-2026!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  out.push({
    check: "admin login direct to /admin",
    finalUrl: page.url(),
    path: visited.filter((v, i) => visited[i - 1] !== v),
    pass: page.url().endsWith("/admin") && !visited.includes("/dashboard"),
  });
  await page.screenshot({ path: "/tmp/bf-shots/v3-admin-login.png" });
  await ctx.close();
}

// 3. Corporation login → straight to corporation dashboard
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  const visited = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && visited.push(new URL(f.url()).pathname));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "corp.demo@buildforce.dev");
  await page.fill('input[type="password"]', "Demo2026!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  out.push({
    check: "corp login direct to corp dashboard",
    finalUrl: page.url(),
    pass: page.url().includes("/corporation-dashboard") && !visited.includes("/dashboard"),
  });
  await ctx.close();
}

// 4. Logged-in contractor on landing: CTA → /new-request directly (no bounce)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "contractor.demo@buildforce.dev");
  await page.fill('input[type="password"]', "Demo2026!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const stillOnLanding = page.url().replace(BASE, "") === "/";
  await page.getByRole("link", { name: /פרסם בקשת כוח אדם/ }).first().click();
  await page.waitForTimeout(1500);
  out.push({
    check: "contractor browses landing + CTA→new-request",
    stayedOnLanding: stillOnLanding,
    url: page.url(),
    pass: stillOnLanding && page.url().includes("/new-request"),
  });
  await ctx.close();
}

await browser.close();
for (const o of out) console.log(o.pass ? "✅" : "❌", JSON.stringify(o));
