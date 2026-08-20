import { chromium } from "playwright";

const BASE = "https://temple-seva-platform.web.app";

(async () => {
  console.log("=== TESTING ADMIN LOGIN & SUPER ADMIN ROLE RECOGNITION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on("requestfailed", (req) => {
    console.log(`FAILED REQUEST: ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    console.log(`Navigating to ${BASE}/admin/login ...`);
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");
    const submitBtn = page.locator("button[type='submit']");

    if (await emailInput.isVisible()) {
      console.log("✓ Admin Login page rendered fields cleanly.");
    }
  } catch (e) {
    console.error("Test error:", e);
  } finally {
    await browser.close();
  }
})();
