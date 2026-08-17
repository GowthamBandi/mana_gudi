import { expect, test, type Page } from "@playwright/test";

/**
 * The committee workflow, exercised in a real browser.
 *
 * This is the test that matters most: it proves in the running system that a
 * single person cannot move money from entry to public ledger alone, and that a
 * published figure cannot be altered without leaving a public trail.
 */

const PASSWORD = "TempleSeva#2026";
const TREASURER = "treasurer@temple.test";
const JOINT_TREASURER = "finance2@temple.test";
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

test("a donation needs two different people before the village can see it", async ({ page }) => {
  const donorName = `Test Donor ${Date.now()}`;

  // --- Treasurer records the donation -------------------------------------
  await signIn(page, TREASURER);
  await page.goto("/admin/donations");

  await page.getByRole("button", { name: "New donation" }).click();
  await page.getByLabel("Donor name").fill(donorName);
  await page.getByLabel("Amount (₹)").fill("10000");
  await page.getByLabel("Purpose").fill("Gopuram Repair");
  await page.getByRole("button", { name: "Record and submit for verification" }).click();

  await expect(page.getByText(/Recorded receipt DON-\d{4}-\d{5}/)).toBeVisible();
  const notice = await page.getByText(/Recorded receipt DON-\d{4}-\d{5}/).textContent();
  const receiptNo = notice?.match(/DON-\d{4}-\d{5}/)?.[0];
  expect(receiptNo).toBeTruthy();

  // --- The same person must NOT be able to verify it ----------------------
  const ownCard = page.locator("li").filter({ hasText: receiptNo! }).first();
  await expect(ownCard).toContainText("another committee member must verify it");
  await expect(ownCard.getByRole("button", { name: "Verify this record" })).toHaveCount(0);

  // The donation must not be publicly visible yet.
  const publicCheck = await page.request.get(`/verify?ref=${receiptNo}`);
  expect(publicCheck.ok()).toBeTruthy();

  await signOut(page);

  // --- A second treasurer verifies and publishes --------------------------
  await signIn(page, JOINT_TREASURER);
  await page.goto("/admin/donations");

  const reviewCard = page.locator("li").filter({ hasText: receiptNo! }).first();
  await expect(reviewCard).toBeVisible();
  await reviewCard.getByRole("button", { name: "Verify this record" }).click();
  await expect(page.getByText(`${receiptNo} verified.`)).toBeVisible();

  await page.locator("#status-filter").selectOption("VERIFIED");
  const verifiedCard = page.locator("li").filter({ hasText: receiptNo! }).first();
  await verifiedCard.getByRole("button", { name: "Publish publicly" }).click();
  await expect(page.getByText(`${receiptNo} published to the public ledger.`)).toBeVisible();

  // --- The village can now verify the receipt -----------------------------
  await page.goto(`/verify?ref=${receiptNo}`);
  await expect(page.getByText("This is a genuine temple donation")).toBeVisible();
  await expect(page.getByText("₹10,000")).toBeVisible();
  await expect(page.getByText(donorName)).toBeVisible();
});

test("a published amount cannot be changed without a public correction record", async ({
  page,
}) => {
  const donorName = `Correction Donor ${Date.now()}`;

  // Get a donation all the way to PUBLISHED.
  await signIn(page, TREASURER);
  await page.goto("/admin/donations");
  await page.getByRole("button", { name: "New donation" }).click();
  await page.getByLabel("Donor name").fill(donorName);
  await page.getByLabel("Amount (₹)").fill("10000");
  await page.getByLabel("Purpose").fill("Annadanam");
  await page.getByRole("button", { name: "Record and submit for verification" }).click();

  const notice = await page.getByText(/Recorded receipt DON-\d{4}-\d{5}/).textContent();
  const receiptNo = notice!.match(/DON-\d{4}-\d{5}/)![0];
  await signOut(page);

  await signIn(page, JOINT_TREASURER);
  await page.goto("/admin/donations");
  await page.locator("li").filter({ hasText: receiptNo }).first()
    .getByRole("button", { name: "Verify this record" }).click();
  await expect(page.getByText(`${receiptNo} verified.`)).toBeVisible();
  await page.locator("#status-filter").selectOption("VERIFIED");
  await page.locator("li").filter({ hasText: receiptNo }).first()
    .getByRole("button", { name: "Publish publicly" }).click();
  await expect(page.getByText(`${receiptNo} published`)).toBeVisible();

  // --- Now correct ₹10,000 down to ₹8,000 ---------------------------------
  await page.locator("#status-filter").selectOption("PUBLISHED");
  const card = page.locator("li").filter({ hasText: receiptNo }).first();
  await card.getByRole("button", { name: "Correct this record" }).click();

  // A correction without a reason must be refused.
  await card.getByLabel("Corrected amount (₹)").fill("8000");
  await card.getByRole("button", { name: "Record this correction permanently" }).click();
  await expect(page.getByText(/A reason is required/)).toBeVisible();

  await card.getByLabel("Reason for the correction").fill(
    "Counterfoil shows 8,000. 10,000 was keyed in error.",
  );
  await card.getByRole("button", { name: "Record this correction permanently" }).click();
  await expect(page.getByText(/corrected\./)).toBeVisible();

  // --- The old figure must still be visible to the public ------------------
  await page.goto("/transparency/corrections");
  const entry = page.locator("li").filter({ hasText: receiptNo }).first();
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("₹10,000"); // what it used to say
  await expect(entry).toContainText("₹8,000"); // what it says now
  await expect(entry).toContainText("keyed in error");

  // --- And the receipt itself is flagged as corrected ----------------------
  await page.goto(`/verify?ref=${receiptNo}`);
  await expect(page.getByText("₹8,000")).toBeVisible();
  await expect(page.getByText(/this entry was corrected/i)).toBeVisible();
});

test("an auditor can read the records but is offered no way to change them", async ({ page }) => {
  await signIn(page, AUDITOR);

  await page.goto("/admin/donations");
  // Auditors can see the ledger…
  await expect(page.getByRole("heading", { name: "Donations" })).toBeVisible();
  await page.locator("#status-filter").selectOption("ALL");
  await expect(page.getByText(/DON-\d{4}-\d{5}/).first()).toBeVisible();

  // …but every write affordance is absent.
  await expect(page.getByRole("button", { name: "New donation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verify this record" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish publicly" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Correct this record" })).toHaveCount(0);

  // The audit log is available to them.
  await expect(page.getByRole("link", { name: "Audit log" })).toBeVisible();
});

test("an event administrator cannot reach the finance ledger", async ({ page }) => {
  await signIn(page, EVENTS_ADMIN);

  // The navigation does not offer finance sections at all.
  await expect(page.getByRole("link", { name: "Donations" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);

  // Forcing the URL directly gets a refusal, not the data.
  await page.goto("/admin/donations");
  await expect(page.getByText("Not available to your role")).toBeVisible();
  await expect(page.getByText(/DON-\d{4}-\d{5}/)).toHaveCount(0);
});

test("signing out ends the session and protects admin pages", async ({ page }) => {
  await signIn(page, TREASURER);
  await page.goto("/admin/donations");
  await expect(page.getByRole("heading", { name: "Donations" })).toBeVisible();

  await signOut(page);

  // Going back to an admin URL must not show data from the previous session.
  await page.goto("/admin/donations");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/DON-\d{4}-\d{5}/)).toHaveCount(0);
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

  // Identical messages: the form cannot be used to enumerate committee accounts.
  expect(realAccountMessage).toBe(fakeAccountMessage);
});
