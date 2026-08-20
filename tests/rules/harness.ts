import fs from "node:fs";
import path from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from "@firebase/rules-unit-testing";

export const PROJECT_ID = "temple-rules-test";

export const UIDS = {
  superAdmin: "uid-super",
  finance1: "uid-finance-1",
  finance2: "uid-finance-2",
  eventAdmin: "uid-event",
  contentAdmin: "uid-content",
  auditor: "uid-auditor",
  volunteer: "uid-volunteer",
  suspendedFinance: "uid-suspended",
  strangerAuthed: "uid-stranger",
} as const;

const ADMIN_FIXTURES: Array<[string, string, string]> = [
  [UIDS.superAdmin, "SUPER_ADMIN", "ACTIVE"],
  [UIDS.finance1, "FINANCE_ADMIN", "ACTIVE"],
  [UIDS.finance2, "FINANCE_ADMIN", "ACTIVE"],
  [UIDS.eventAdmin, "EVENT_ADMIN", "ACTIVE"],
  [UIDS.contentAdmin, "CONTENT_ADMIN", "ACTIVE"],
  [UIDS.auditor, "AUDITOR", "ACTIVE"],
  [UIDS.volunteer, "VOLUNTEER", "ACTIVE"],
  [UIDS.suspendedFinance, "FINANCE_ADMIN", "SUSPENDED"],
];

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  const rulesPath = process.env.RULES_FILE ?? "firebase/firestore.rules";
  const rules = fs.readFileSync(path.resolve(process.cwd(), rulesPath), "utf8");

  const config: Parameters<typeof initializeTestEnvironment>[0] = {
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  };

  if (process.env.TEST_STORAGE) {
    const storageRules = fs.readFileSync(path.resolve(process.cwd(), "firebase/storage.rules"), "utf8");
    config.storage = {
      rules: storageRules,
      host: "127.0.0.1",
      port: 9199,
    };
  }

  return initializeTestEnvironment(config);
}

/** Seeds the administrator directory that the rules resolve roles from. */
export async function seedAdmins(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, role, status] of ADMIN_FIXTURES) {
      await db.doc(`admin_users/${uid}`).set({
        role,
        status,
        displayName: `Test ${role}`,
        email: `${uid}@temple.test`,
        createdBy: UIDS.superAdmin,
      });
    }
  });
}

export function asUser(env: RulesTestEnvironment, uid: string): RulesTestContext {
  return env.authenticatedContext(uid);
}

export function asAnonymous(env: RulesTestEnvironment): RulesTestContext {
  return env.unauthenticatedContext();
}

/** Writes fixture data bypassing rules, for arranging preconditions. */
export async function seed(
  env: RulesTestEnvironment,
  writes: (db: ReturnType<RulesTestContext["firestore"]>) => Promise<void>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await writes(ctx.firestore());
  });
}

export interface DonationSeed {
  status?: string;
  amountPaise?: number;
  createdBy?: string;
  verifiedBy?: string | null;
  revisionCount?: number;
  displayPreference?: string;
  receiptNo?: string;
}

export function donationDoc(overrides: DonationSeed = {}) {
  return {
    receiptNo: overrides.receiptNo ?? "DON-2026-00001",
    donorName: "Ramesh Kumar",
    donorPhone: "9876543210",
    donorEmail: "ramesh@example.com",
    donorAddress: "12 Temple Street",
    displayPreference: overrides.displayPreference ?? "FULL",
    amountPaise: overrides.amountPaise ?? 1_000_000,
    currency: "INR",
    purpose: "Annadanam",
    fundId: "fund-annadanam",
    occurredAt: new Date("2026-01-15T06:00:00Z"),
    paymentMethod: "UPI",
    referenceNo: "UPI-123456",
    status: overrides.status ?? "DRAFT",
    createdBy: overrides.createdBy ?? UIDS.finance1,
    createdAt: new Date("2026-01-15T06:05:00Z"),
    verifiedBy: overrides.verifiedBy ?? null,
    publishedBy: null,
    revisionCount: overrides.revisionCount ?? 0,
    rejectionReason: null,
    lastCorrectionReason: null,
  };
}

export function expenseDoc(overrides: DonationSeed = {}) {
  return {
    voucherNo: "EXP-2026-00001",
    category: "Maintenance",
    description: "Roof repair",
    amountPaise: overrides.amountPaise ?? 500_000,
    currency: "INR",
    fundId: "fund-development",
    payeeDisplay: "Local Contractor",
    occurredAt: new Date("2026-01-20T06:00:00Z"),
    status: overrides.status ?? "DRAFT",
    createdBy: overrides.createdBy ?? UIDS.finance1,
    createdAt: new Date("2026-01-20T06:05:00Z"),
    verifiedBy: overrides.verifiedBy ?? null,
    publishedBy: null,
    revisionCount: overrides.revisionCount ?? 0,
    rejectionReason: null,
    lastCorrectionReason: null,
  };
}
