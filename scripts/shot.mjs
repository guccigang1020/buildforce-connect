// Usage: node scripts/shot.mjs <url-path> <outname> [width] [--login email password]
import { chromium } from "playwright";

const [, , path = "/", out = "shot", width = "1440", ...rest] = process.argv;
const BASE = "http://localhost:8080";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(width), height: 900 },
  locale: "he-IL",
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

const li = rest.indexOf("--login");
if (li !== -1) {
  const [email, password] = rest.slice(li + 1);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
}

await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `/tmp/bf-shots/${out}.png`, fullPage: false });
console.log(`saved /tmp/bf-shots/${out}.png  url=${page.url()}`);
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.slice(0, 10).join("\n"));
await browser.close();
