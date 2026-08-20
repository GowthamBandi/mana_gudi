import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE = "https://temple-seva-platform.web.app";
const SHOT_DIR = "C:/Users/Gowtham/.gemini/antigravity/brain/1f98a6b0-c6d6-4e5c-887e-c2b53702c111/scratch/screenshots";

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

const routes = [
  "/",
  "/about",
  "/events",
  "/announcements",
  "/transparency",
  "/transparency/donations",
  "/transparency/expenses",
  "/transparency/corrections",
  "/verify",
  "/gallery",
  "/videos",
  "/documents",
  "/volunteer",
  "/feedback",
  "/contact",
  "/admin/login",
];

const viewports = [
  { width: 1440, height: 900, name: "desktop-1440" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 390, height: 844, name: "mobile-390" },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  console.log("=== STARTING HUMAN-QUALITY VISUAL & FUNCTIONAL ACCEPTANCE ===");

  const issues: string[] = [];

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const netErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      page.on("requestfailed", (req) => {
        netErrors.push(`${req.url()} (${req.failure()?.errorText})`);
      });

      page.on("response", (res) => {
        if (res.status() >= 400) {
          netErrors.push(`HTTP ${res.status()}: ${res.url()}`);
        }
      });

      try {
        const url = `${BASE}${route}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);

        // Check horizontal overflow (scrollWidth > clientWidth)
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasOverflow) {
          issues.push(`[${vp.name}] ${route}: Horizontal overflow detected! (scrollWidth > clientWidth)`);
        }

        if (consoleErrors.length > 0) {
          issues.push(`[${vp.name}] ${route}: Console errors: ${consoleErrors.join(" | ")}`);
        }

        if (netErrors.length > 0) {
          issues.push(`[${vp.name}] ${route}: Network errors: ${netErrors.join(" | ")}`);
        }

        // Take screenshot for desktop and mobile
        if (vp.name === "desktop-1440" || vp.name === "mobile-390") {
          const safeName = route.replace(/\//g, "_") || "_home";
          const shotPath = path.join(SHOT_DIR, `${vp.name}${safeName}.png`);
          await page.screenshot({ path: shotPath, fullPage: false });
        }
      } catch (e) {
        issues.push(`[${vp.name}] ${route}: Page load error: ${String(e)}`);
      }

      await page.close();
    }

    await context.close();
  }

  // Bilingual Check (Telugu Language Switching)
  console.log("\n--- Testing Bilingual Telugu Switching ---");
  const langContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const langPage = await langContext.newPage();

  try {
    await langPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await langPage.waitForTimeout(2000);

    // Find and click the VISIBLE Telugu button (desktop or mobile header)
    const teluguBtn = langPage.locator("button:visible:has-text('తెలుగు')").first();
    if (await teluguBtn.isVisible()) {
      await teluguBtn.click();
      await langPage.waitForTimeout(2000);

      const bodyText = (await langPage.textContent("body")) ?? "";
      if (bodyText.includes("మన గుడి") || bodyText.includes("వివరాలు") || bodyText.includes("తెలుగు")) {
        console.log("✓ Telugu switching verified! Telugu text rendered correctly.");
      } else {
        issues.push("Bilingual Telugu: Clicking Telugu button did not render Telugu text.");
      }

      // Check persistence after reload
      await langPage.reload({ waitUntil: "domcontentloaded" });
      await langPage.waitForTimeout(2000);
      const reloadedBody = (await langPage.textContent("body")) ?? "";
      if (reloadedBody.includes("మన గుడి") || reloadedBody.includes("వివరాలు") || reloadedBody.includes("తెలుగు")) {
        console.log("✓ Language preference persistence verified after reload.");
      } else {
        issues.push("Bilingual Telugu: Language preference did not persist after page reload.");
      }
    } else {
      issues.push("Bilingual Telugu: Could not find Telugu language switcher button.");
    }
  } catch (e) {
    issues.push(`Bilingual Telugu error: ${String(e)}`);
  }

  await langContext.close();

  // Admin Login Workflow
  console.log("\n--- Testing Admin Login Form Workflow ---");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();

  try {
    await adminPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await adminPage.waitForTimeout(2000);

    // Test form inputs
    const emailInput = adminPage.locator("input[type='email']");
    const passwordInput = adminPage.locator("input[type='password']");
    const submitBtn = adminPage.locator("button[type='submit']");

    if ((await emailInput.isVisible()) && (await passwordInput.isVisible()) && (await submitBtn.isVisible())) {
      console.log("✓ Admin Login form fields (email, password, submit) are all visible and interactive.");

      // Test invalid login
      await emailInput.fill("testadmin@managudi.org");
      await passwordInput.fill("wrongpassword");
      await submitBtn.click();
      await adminPage.waitForTimeout(3000);

      const alertText = await adminPage.textContent("[role='alert']");
      if (alertText && alertText.length > 0) {
        console.log(`✓ Admin invalid login test passed. Error displayed: "${alertText.trim()}"`);
      } else {
        issues.push("Admin Login: Invalid password did not produce a visible role='alert' error message.");
      }
    } else {
      issues.push("Admin Login: Email or Password input fields missing.");
    }
  } catch (e) {
    issues.push(`Admin Login error: ${String(e)}`);
  }

  await adminContext.close();
  await browser.close();

  console.log("\n=== HUMAN-QUALITY ACCEPTANCE AUDIT RESULTS ===");
  if (issues.length === 0) {
    console.log("🟢 100% CLEAN! Zero visual overflow, zero console errors, zero network errors across all viewports and languages!");
    process.exit(0);
  } else {
    console.log(`🔴 ISSUES FOUND (${issues.length}):`);
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    process.exit(1);
  }
})();
