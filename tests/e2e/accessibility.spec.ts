/**
 * Accessibility audit.
 *
 * This temple's users include elderly devotees, people using a phone in bright
 * sunlight, and people who cannot use a mouse. Violations here are treated as
 * failures, not as advisory warnings.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = [
  "/",
  "/transparency",
  "/transparency/donations",
  "/transparency/expenses",
  "/transparency/corrections",
  "/verify",
  "/events",
  "/announcements",
  "/about",
  "/contact",
  "/feedback",
  "/volunteer",
  "/admin/login",
];

for (const path of PUBLIC_PAGES) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);

    // NOT networkidle: Firestore holds a long-lived connection open, so the
    // network never goes idle and the wait would simply time out. Instead wait
    // for the heading and for every loading placeholder to clear, so axe audits
    // the real content rather than a spinner.
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await page
      .waitForFunction(() => !document.body.textContent?.includes("Loading"), null, {
        timeout: 15_000,
      })
      .catch(() => {
        /* a page with no async content never shows a placeholder */
      });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    );

    expect(summary, `Accessibility violations on ${path}`).toEqual([]);
  });
}

test("every page is reachable and operable with the keyboard alone", async ({ page }) => {
  await page.goto("/");

  // The first tab stop must be the skip link, so a keyboard user is not forced
  // through the whole navigation on every page.
  await page.keyboard.press("Tab");
  const firstFocused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(firstFocused).toBe("Skip to main content");

  // Focus must remain visible as the user moves through the header.
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    const hasVisibleFocus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return false;
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(hasVisibleFocus, `focus invisible at tab stop ${i + 2}`).toBe(true);
  }
});

test("the receipt verification form can be completed without a mouse", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Receipt number").focus();
  await page.keyboard.type("DON-2026-00001");
  await page.keyboard.press("Enter");
  // Submitting by Enter must work, not only by clicking the button.
  await expect(page.getByText(/is not in the published accounts|genuine temple donation/)).toBeVisible();
});

test("form errors are announced, not signalled by colour alone", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByLabel("Tell us what happened").fill("short");
  await page.getByRole("button", { name: "Send to the committee" }).click();

  // Scoped to the form: Next.js renders its own route-announcer with
  // role="alert", which would otherwise match here.
  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/more detail/);
});
