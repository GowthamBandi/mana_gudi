import { expect, test } from "@playwright/test";

/**
 * Public visitor journeys, run in a real browser against the real app.
 *
 * Console errors are treated as failures. A page that renders correctly while
 * throwing in the console is not working — it is failing quietly.
 */

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  // Attach for assertion in individual tests.
  (page as unknown as { __errors: string[] }).__errors = errors;
});

function consoleErrors(page: unknown): string[] {
  return (page as { __errors: string[] }).__errors ?? [];
}

test("a villager can read the temple accounts without an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every rupee");

  // The headline totals must actually load from Firestore, not sit on a spinner.
  // Scoped to the specific tile so the assertion cannot be satisfied by some
  // other number that happens to be on the page.
  const donationTile = page.locator("div").filter({ hasText: /^Donations received/ }).first();
  await expect(donationTile).toContainText(/₹[\d.]+ L/);
  await expect(donationTile).toContainText("6 receipts");

  await page.getByRole("link", { name: "See the temple accounts" }).click();
  await expect(page).toHaveURL(/\/transparency$/);
  await expect(page.getByRole("heading", { name: "Temple Transparency Centre" })).toBeVisible();

  // Real figures, not placeholders.
  await expect(page.getByText("Total donations received")).toBeVisible();
  await expect(page.getByText("Total money spent")).toBeVisible();
  await expect(page.getByText("General Fund")).toBeVisible();

  expect(consoleErrors(page)).toEqual([]);
});

test("the donation register lists published donations and can be searched", async ({ page }) => {
  await page.goto("/transparency/donations");
  await expect(page.getByRole("heading", { name: "Donation register" })).toBeVisible();

  // Search rather than assuming a seeded row sits on the first page: the
  // register is ordered by date and grows every time the workflow tests run.
  await page.getByLabel("Search these donations").fill("Ramesh");
  await expect(page.getByRole("cell", { name: /Ramesh Kumar/ })).toBeVisible();

  await page.getByLabel("Search these donations").fill("Annadanam");
  await expect(page.getByRole("cell", { name: "Annadanam" }).first()).toBeVisible();

  await page.getByLabel("Search these donations").fill("zzzznotfound");
  await expect(page.getByText(/No donations match/)).toBeVisible();
});

test("an anonymous donor's real name never appears publicly", async ({ page }) => {
  await page.goto("/transparency/donations");
  await expect(page.getByRole("cell", { name: "Anonymous Devotee" }).first()).toBeVisible();

  // "Suresh Babu" chose ANONYMOUS in the seed data. His name must be absent
  // from the entire public page, including any hidden markup.
  const html = await page.content();
  expect(html).not.toContain("Suresh Babu");

  // The masked donor is shown as initials, never in full.
  expect(html).not.toContain("Lakshmi Devi");
  await expect(page.getByRole("cell", { name: /L\*+ D\*+/ })).toBeVisible();
});

test("no donor phone number is reachable from the public site", async ({ page }) => {
  await page.goto("/transparency/donations");
  const html = await page.content();
  // Seeded donor phones all start with this prefix.
  expect(html).not.toMatch(/98765\d{5}/);
});

test("a devotee can verify a genuine receipt", async ({ page }) => {
  await page.goto("/verify");
  const year = new Date().getFullYear();

  await page.getByLabel("Receipt number").fill(`DON-${year}-00001`);
  await page.getByRole("button", { name: "Check this receipt" }).click();

  await expect(page.getByText("This is a genuine temple donation")).toBeVisible();
  await expect(page.getByText("₹25,000")).toBeVisible();
  await expect(page.getByText("Ramesh Kumar")).toBeVisible();
});

test("verification is honest about a receipt that does not exist", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Receipt number").fill("DON-2026-99999");
  await page.getByRole("button", { name: "Check this receipt" }).click();
  await expect(page.getByText(/is not in the published accounts/)).toBeVisible();
});

test("verification rejects a malformed reference without crashing", async ({ page }) => {
  await page.goto("/verify");
  for (const junk of ["../../etc/passwd", "<script>alert(1)</script>", "DROP TABLE"]) {
    await page.getByLabel("Receipt number").fill(junk);
    await page.getByRole("button", { name: "Check this receipt" }).click();
    await expect(page.getByText("That does not look like a receipt number")).toBeVisible();
  }
  expect(consoleErrors(page)).toEqual([]);
});

test("a QR link straight to a receipt verifies on arrival", async ({ page }) => {
  const year = new Date().getFullYear();
  await page.goto(`/verify?ref=DON-${year}-00002`);
  await expect(page.getByText("This is a genuine temple donation")).toBeVisible();
  // The masked donor is shown masked even on the verification page.
  await expect(page.getByText(/L\*+ D\*+/)).toBeVisible();
});

test("a villager can register for a homam without an account", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Events, poojas and homams" })).toBeVisible();

  await page.getByRole("link", { name: "Maha Shivaratri Homam" }).click();
  await expect(page.getByRole("heading", { name: "Maha Shivaratri Homam" })).toBeVisible();

  const phone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
  await page.getByLabel("Your name").fill("Sita Devi");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("How many people are coming?").fill("3");
  await page.getByRole("button", { name: "Confirm my registration" }).click();

  await expect(page.getByText("You are registered")).toBeVisible();
});

test("registering the same phone twice is handled gracefully", async ({ page }) => {
  const phone = `97${Math.floor(10000000 + Math.random() * 89999999)}`;

  for (const attempt of [1, 2]) {
    await page.goto("/events?id=evt-shivaratri");
    await page.getByLabel("Your name").fill("Duplicate Tester");
    await page.getByLabel("Mobile number").fill(phone);
    await page.getByLabel("How many people are coming?").fill("1");
    await page.getByRole("button", { name: "Confirm my registration" }).click();

    if (attempt === 1) {
      await expect(page.getByText("You are registered", { exact: true })).toBeVisible();
    } else {
      // The second attempt must not create a duplicate, and must explain the
      // situation in plain language rather than showing a permission error.
      await expect(page.getByText("You are already registered")).toBeVisible();
      await expect(page.getByText(/already registered for this event/)).toBeVisible();
    }
  }
});

test("registration rejects an invalid mobile number with a helpful message", async ({ page }) => {
  await page.goto("/events?id=evt-shivaratri");
  await page.getByLabel("Your name").fill("Bad Number");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("How many people are coming?").fill("1");
  await page.getByRole("button", { name: "Confirm my registration" }).click();
  await expect(page.getByText(/Enter a 10-digit Indian mobile number/)).toBeVisible();
});

test("a villager can file a complaint and receives a tracking number", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByLabel("Tell us what happened").fill(
    "The water tap near the temple entrance has been broken for two weeks.",
  );
  await page.getByRole("button", { name: "Send to the committee" }).click();

  await expect(page.getByText("Thank you — it has been recorded")).toBeVisible();
  await expect(page.getByText(/^FB-[A-Z2-9]{5}-[A-Z2-9]{5}$/)).toBeVisible();
});

test("the corrections register explains itself even when empty", async ({ page }) => {
  await page.goto("/transparency/corrections");
  await expect(page.getByRole("heading", { name: "Corrections register" })).toBeVisible();
  await expect(page.getByText(/will not allow a published amount to be altered/)).toBeVisible();
});

test("notices load", async ({ page }) => {
  await page.goto("/announcements");
  await expect(page.getByText("Maha Shivaratri — extended darshan timings")).toBeVisible();
});
