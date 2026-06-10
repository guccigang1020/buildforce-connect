import { chromium } from "playwright";
const BASE = "http://localhost:8080";
const SHOTS = "/tmp/bf-shots";

const PLANS = [
  { who: "public", login: null, routes: ["/", "/login", "/signup", "/privacy", "/terms"] },
  {
    who: "contractor",
    login: ["contractor.demo@buildforce.dev", "Demo2026!"],
    routes: ["/dashboard", "/new-request", "/contractor/projects", "/contractor/attendance", "/contractor/accounts", "/my-requests/95ba9e1b-943c-4a7e-9f02-82d2cf38f700"],
  },
  {
    who: "corp",
    login: ["corp.demo@buildforce.dev", "Demo2026!"],
    routes: ["/corporation-dashboard", "/corporation/attendance", "/corporation/accounts"],
  },
  {
    who: "admin",
    login: ["admin@buildforce.dev", "BuildForce-Admin-2026!"],
    routes: ["/admin"],
  },
];

const browser = await chromium.launch();
const report = [];
for (const plan of PLANS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
  const page = await ctx.newPage();
  let errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message.slice(0, 120)}`));
  if (plan.login) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', plan.login[0]);
    await page.fill('input[type="password"]', plan.login[1]);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3500);
  }
  for (const r of plan.routes) {
    errors = [];
    // reattach error collector reference
    await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" }).catch((e) => errors.push(`NAV: ${e.message.slice(0, 80)}`));
    await page.waitForTimeout(1800);
    const name = `sweep-${plan.who}${r.replaceAll("/", "-")}`.slice(0, 60);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
    report.push({ who: plan.who, route: r, finalUrl: page.url().replace(BASE, ""), errors: [...new Set(errors)].slice(0, 4) });
  }
  await ctx.close();
}
await browser.close();
for (const r of report) {
  const flag = r.errors.length ? "❌" : "✅";
  console.log(`${flag} [${r.who}] ${r.route}${r.finalUrl !== r.route ? ` → ${r.finalUrl}` : ""}${r.errors.length ? "\n   " + r.errors.join("\n   ") : ""}`);
}
