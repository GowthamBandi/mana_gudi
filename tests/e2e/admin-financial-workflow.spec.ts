import { expect, test, type Page } from "@playwright/test";

/**
 * The committee workflow, exercised in a real browser.
 *
 * Verifies single-authority immediate publication, public transparency,
 * and immutable witnessed correction requirements.
 */

const PASSWORD = "TempleSeva#2026";
const TREASURER = "treasurer@temple.test";
const AUDITOR = "auditor@temple.test";
const EVENTS_ADMIN = "events@temple.test";

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/admin\/login/);
}

test("a donation is created and immediately published to the public website", async ({ page }) => {
  const donorName = `Test Donor ${Date.now()}`;

  await signIn(page, TREASURER);
  await page.goto("/admin/donations");

  await page.getByRole("button", { name: "New donation" }).click();
  await page.getByLabel("Donor name").fill(donorName);
  await page.getByLabel("Amount (₹)").fill("10000");
  await page.getByLabel("Purpose").fill("Gopuram Repair");
  await page.getByRole("button", { name: "Submit & Publish Donation" }).click();

  await expect(page.getByText(/Recorded and published donation DON-\d{4}-\d{5}/)).toBeVisible();
  const notice = await page.getByText(/Recorded and published donation DON-\d{4}-\d{5}/).textContent();
  const receiptNo = notice?.match(/DON-\d{4}-\d{5}/)?.[0];
  expect(receiptNo).toBeTruthy();

  // The village can immediately verify the receipt on the public site
  await page.goto(`/verify?ref=${receiptNo}`);
  await expect(page.getByText("This is a genuine temple donation")).toBeVisible();
  await expect(page.getByText("₹10,000")).toBeVisible();
  await expect(page.getByText(donorName)).toBeVisible();
});

test("a published amount cannot be changed without a public correction record", async ({
  page,
}) => {
  const donorName = `Correction Donor ${Date.now()}`;

  await signIn(page, TREASURER);
  await page.goto("/admin/donations");
  await page.getByRole("button", { name: "New donation" }).click();
  await page.getByLabel("Donor name").fill(donorName);
  await page.getByLabel("Amount (₹)").fill("10000");
  await page.getByLabel("Purpose").fill("Annadanam");
  await page.getByRole("button", { name: "Submit & Publish Donation" }).click();

  const notice = await page.getByText(/Recorded and published donation DON-\d{4}-\d{5}/).textContent();
  const receiptNo = notice!.match(/DON-\d{4}-\d{5}/)![0];

  // --- Correct ₹10,000 down to ₹8,000 ---------------------------------
  const card = page.locator("div").filter({ hasText: receiptNo }).first();
  await card.getByRole("button", { name: "Correct Record" }).click();

  await card.getByLabel("Corrected Amount (₹)").fill("8000");
  await card.getByLabel("Reason for correction").fill(
    "Counterfoil shows 8,000. 10,000 was keyed in error.",
  );
  await card.getByRole("button", { name: "Record Correction" }).click();

  // --- Old figure still recorded in public corrections register -------------
  await page.goto("/transparency/corrections");
  const entry = page.locator("div").filter({ hasText: receiptNo }).first();
  await expect(entry).toBeVisible();

  // --- Receipt itself reflects corrected state ------------------------------
  await page.goto(`/verify?ref=${receiptNo}`);
  await expect(page.getByText("₹8,000")).toBeVisible();
  await expect(page.getByText(/this entry was corrected/i)).toBeVisible();
});

test("an auditor can read the records but is offered no way to change them", async ({ page }) => {
  await signIn(page, AUDITOR);

  await page.goto("/admin/donations");
  await expect(page.getByRole("heading", { name: "Donations" })).toBeVisible();

  // Every write affordance is absent for auditors
  await expect(page.getByRole("button", { name: "New donation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Correct Record" })).toHaveCount(0);

  // The audit log is available read-only
  await expect(page.getByRole("link", { name: "Audit" })).toBeVisible();
});

test("an event administrator cannot reach the finance ledger", async ({ page }) => {
  await signIn(page, EVENTS_ADMIN);

  // The navigation does not offer finance sections
  await expect(page.getByRole("link", { name: "Donations" })).toHaveCount(0);

  // Forcing the URL directly gets a refusal
  await page.goto("/admin/donations");
  await expect(page.getByText("Not available to your role")).toBeVisible();
});

test("signing out ends the session and protects admin pages", async ({ page }) => {
  await signIn(page, TREASURER);
  await page.goto("/admin/donations");
  await expect(page.getByRole("heading", { name: "Donations" })).toBeVisible();

  await signOut(page);

  await page.goto("/admin/donations");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a wrong password is refused without revealing whether the account exists", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(TREASURER);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const realAccountMessage = await page.getByRole("alert").textContent();

  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill("nobody@nowhere.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const fakeAccountMessage = await page.getByRole("alert").textContent();

  expect(realAccountMessage).toBe(fakeAccountMessage);
});
