/**
 * Live verification against the deployed site.
 *
 * Production Firestore holds no seeded records (seeding needs Admin SDK
 * credentials that are not available in this environment), so these tests
 * verify what CAN be verified live: that every page loads, renders a truthful
 * empty state rather than a spinner or a crash, and produces no console errors.
 *
 * Run with:  E2E_BASE_URL=https://temple-seva-platform.web.app npx playwright test tests/e2e/live-public.spec.ts
 */

import { expect, test } from "@playwright/test";

const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
});

test("the home page loads and explains the temple's promise", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every rupee");
  await expect(page.getByRole("link", { name: "See the temple accounts" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the transparency centre renders an honest empty state, not a spinner", async ({ page }) => {
  await page.goto("/transparency");
  await expect(page.getByRole("heading", { name: "Temple Transparency Centre" })).toBeVisible();

  // With no published records, the page must say so plainly.
  await expect(page.getByText("No accounts have been published yet")).toBeVisible();
  await expect(page.getByText("No published figure has ever been changed")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the donation register handles an empty ledger", async ({ page }) => {
  await page.goto("/transparency/donations");
  await expect(page.getByRole("heading", { name: "Donation register" })).toBeVisible();
  await expect(page.getByText("No donations published yet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("receipt verification works live and is honest about an unknown receipt", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Receipt number").fill("DON-2026-00001");
  await page.getByRole("button", { name: "Check this receipt" }).click();
  await expect(page.getByText(/is not in the published accounts/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("receipt verification rejects malformed input live", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Receipt number").fill("not-a-receipt");
  await page.getByRole("button", { name: "Check this receipt" }).click();
  await expect(page.getByText("That does not look like a receipt number")).toBeVisible();
});

test("the events page loads with no events scheduled", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Events, poojas and homams" })).toBeVisible();
  await expect(page.getByText("No events are scheduled at the moment")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a member of the public can file a complaint against the live database", async ({ page }) => {
  // This is a genuine end-to-end write to production, proving the public
  // participation path works against the deployed security rules.
  await page.goto("/feedback");
  await page.getByLabel("Tell us what happened").fill(
    "Live deployment verification — please disregard this test submission.",
  );
  await page.getByRole("button", { name: "Send to the committee" }).click();

  await expect(page.getByText("Thank you — it has been recorded")).toBeVisible();
  await expect(page.getByText(/^FB-[A-Z2-9]{5}-[A-Z2-9]{5}$/)).toBeVisible();
});

test("the committee portal is reachable but grants nothing without credentials", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Committee sign in" })).toBeVisible();
  // There must be no route to self-registration anywhere on this page.
  await expect(page.getByRole("link", { name: /create.*account|register|sign up/i })).toHaveCount(0);
});

test("forcing an admin URL without a session reveals no data", async ({ page }) => {
  await page.goto("/admin/donations");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/DON-\d{4}-\d{5}/)).toHaveCount(0);
});

test("the site is usable on a narrow phone screen without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ["/", "/transparency", "/verify", "/events"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${path} scrolls horizontally on a 360px screen`).toBe(false);
  }
});
