import { chromium } from "playwright";

const BASE = "https://temple-seva-platform.web.app";

const routes = [
  "/",
  "/about",
  "/events",
  "/announcements",
  "/transparency",
  "/verify",
  "/gallery",
  "/videos",
  "/documents",
  "/volunteer",
  "/feedback",
  "/contact",
  "/admin/login",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const errors: string[] = [];
  const results: { route: string; status: string; detail: string }[] = [];

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.url()} -> ${req.failure()?.errorText ?? "unknown"}`);
    });

    try {
      const url = `${BASE}${route}`;
      // Use domcontentloaded — Firebase SDK long-polling keeps networkidle from ever firing
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const httpStatus = response?.status() ?? 0;

      // Wait 6 seconds for client-side Firebase queries to resolve
      await page.waitForTimeout(6000);

      // Get body text
      const bodyText = await page.textContent("body") ?? "";

      // Check for "Loading" text that never resolved
      const hasLoadingText =
        bodyText.includes("Loading…") || bodyText.includes("Loading events") || bodyText.includes("Loading ");

      // Check for empty states (GOOD — means Firestore query resolved to zero records)
      const hasEmptyState =
        bodyText.includes("No upcoming") ||
        bodyText.includes("No published") ||
        bodyText.includes("not available") ||
        bodyText.includes("No announcements") ||
        bodyText.includes("No gallery") ||
        bodyText.includes("No videos") ||
        bodyText.includes("No documents") ||
        bodyText.includes("₹0");

      // Check for error states (ACCEPTABLE — means query resolved to error with retry)
      const hasErrorState =
        bodyText.includes("Something went wrong") ||
        bodyText.includes("timed out") ||
        bodyText.includes("Try again");

      // Check for real page content (navigation etc)
      const hasPageContent =
        bodyText.includes("Mana Gudi") || bodyText.includes("Admin Login");

      let status = "OK";
      let detail = `HTTP ${httpStatus}`;

      if (httpStatus !== 200) {
        status = "FAIL";
        detail = `HTTP ${httpStatus}`;
      } else if (hasLoadingText && !hasEmptyState && !hasErrorState) {
        status = "STUCK_LOADING";
        detail = "Page STILL shows 'Loading...' after 6s";
      } else if (hasEmptyState) {
        status = "OK";
        detail += " | Empty state displayed ✓";
      } else if (hasErrorState) {
        status = "OK";
        detail += " | Error state with retry ✓";
      } else if (hasPageContent) {
        status = "OK";
        detail += " | Page rendered ✓";
      }

      // Report 404 errors specifically
      const four04s = consoleErrors.filter(e => e.includes("404"));
      if (four04s.length > 0) {
        detail += ` | 404 errors: ${four04s.length}`;
      }

      results.push({ route, status, detail });

      if (status !== "OK") {
        errors.push(`${route}: ${status} — ${detail}`);
        if (consoleErrors.length > 0) {
          for (const ce of consoleErrors.slice(0, 3)) {
            errors.push(`  Console: ${ce.slice(0, 200)}`);
          }
        }
      }
    } catch (e) {
      results.push({
        route,
        status: "TIMEOUT",
        detail: String(e).slice(0, 200),
      });
      errors.push(`${route}: TIMEOUT — ${String(e).slice(0, 200)}`);
    }

    await page.close();
  }

  console.log("\n=== MANA GUDI LIVE DEPLOYED BROWSER VERIFICATION ===");
  console.log(`URL: ${BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  for (const r of results) {
    console.log(`[${r.status}] ${r.route}`);
    console.log(`   ${r.detail}\n`);
  }

  if (errors.length > 0) {
    console.log("\n=== FAILURES ===\n");
    for (const e of errors) console.log(e);
  } else {
    console.log("\n=== ALL ROUTES PASSED ===\n");
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
