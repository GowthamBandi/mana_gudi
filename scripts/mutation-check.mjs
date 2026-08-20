/**
 * Mutation testing for the security rules.
 *
 * A security-rule suite that only ever runs against correct rules proves very
 * little: assertFails() also passes when a request fails for an unrelated
 * reason, such as a typo in the test itself. This script deliberately weakens
 * one guarantee at a time and asserts that the suite NOTICES.
 *
 * A mutant that survives means the corresponding control is untested.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ORIGINAL = fs.readFileSync("firebase/firestore.rules", "utf8").replace(/\r\n/g, "\n");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "temple-mutants-"));

const MUTANTS = [
  {
    name: "financial records become deletable by super admin",
    find: `      // Financial records are never destroyed, by anyone, including SUPER_ADMIN.
      allow delete: if false;`,
    replace: `      allow delete: if isSuper();`,
  },
  {
    // Note: mutating away the bare exists() check alone is an EQUIVALENT mutant
    // — get() on a missing document errors and denies anyway. The real control
    // is the whole witness gate, so that is what is mutated here.
    name: "the correction witness gate is disabled entirely",
    find: `      return incoming().revisionCount == nextRev
          && exists(revPath)
          && get(revPath).data.snapshot.amountPaise == existing().amountPaise
          && get(revPath).data.snapshot.status == existing().status
          && get(revPath).data.snapshot.revisionCount == existing().revisionCount
          && isNonEmptyString(incoming().lastCorrectionReason, 500);`,
    replace: `      return nextRev == nextRev && revPath == revPath;`,
  },
  {
    name: "a revision may lie about the value it replaces",
    find: `                      && incoming().snapshot.amountPaise ==
                           get(/databases/$(database)/documents/donations/$(donationId)).data.amountPaise`,
    replace: `                      && true`,
  },
  {
    name: "the revision ledger becomes rewritable",
    find: `        // Append-only, forever.
        allow update, delete: if false;`,
    replace: `        allow update, delete: if isFinance();`,
  },
  {
    name: "revisions may be written out of sequence",
    find: `                      && revId == string(
                           get(/databases/$(database)/documents/donations/$(donationId)).data.revisionCount + 1);`,
    replace: `                      && revId == revId;`,
  },
  {
    name: "the creator may verify their own donation",
    find: `        || (existing().status == 'SUBMITTED'
          && incoming().status == 'VERIFIED'
          && incoming().verifiedBy == request.auth.uid
          && request.auth.uid != existing().createdBy`,
    replace: `        || (existing().status == 'SUBMITTED'
          && incoming().status == 'VERIFIED'
          && incoming().verifiedBy == request.auth.uid
          && true`,
  },
  {
    name: "the audit log becomes editable",
    find: `      allow update, delete: if false;
    }

    // =================================================================== EVENTS`,
    replace: `      allow update, delete: if isSuper();
    }

    // =================================================================== EVENTS`,
  },
  {
    name: "public donation projections lose their field allowlist",
    find: `        && incoming().keys().hasOnly(['receiptNo', 'displayName', 'amountPaise', 'currency',
                                      'purpose', 'fundId', 'fundName', 'occurredAt',
                                      'publishedAt', 'paymentMethod', 'revisionCount',
                                      'corrected', 'status'])`,
    replace: `        && true`,
  },
  {
    name: "internal donations become world-readable",
    find: `    match /donations/{donationId} {
      allow read: if canReadInternal();`,
    replace: `    match /donations/{donationId} {
      allow read: if true;`,
  },
  {
    name: "suspended administrators keep their powers",
    find: `      return isAdmin() && get(adminPath()).data.status == 'ACTIVE';`,
    replace: `      return isAdmin();`,
  },
  {
    name: "administrators may edit their own role",
    find: `      allow update: if isSuper()
                    && request.auth.uid != uid`,
    replace: `      allow update: if isSuper()`,
  },
];

let survived = 0;
console.log(`Running ${MUTANTS.length} rule mutants\n`);

for (const [index, mutant] of MUTANTS.entries()) {
  if (!ORIGINAL.includes(mutant.find)) {
    console.log(`✗ MUTANT ${index + 1} INVALID — anchor text not found: ${mutant.name}`);
    survived += 1;
    continue;
  }

  const mutatedPath = path.join(tmpDir, `mutant-${index + 1}.rules`);
  fs.writeFileSync(mutatedPath, ORIGINAL.replace(mutant.find, mutant.replace));

  let detected = false;
  try {
    execSync(
      `firebase emulators:exec --only firestore --project temple-rules-test ` +
        `"node node_modules/vitest/vitest.mjs run --config vitest.rules.config.mts"`,
      { env: { ...process.env, RULES_FILE: mutatedPath }, stdio: "pipe" },
    );
  } catch {
    detected = true; // the suite failed, which is the desired outcome
  }

  if (detected) {
    console.log(`✓ killed   — ${mutant.name}`);
  } else {
    console.log(`✗ SURVIVED — ${mutant.name}  (this control is NOT tested)`);
    survived += 1;
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${MUTANTS.length - survived}/${MUTANTS.length} mutants killed`);
if (survived > 0) {
  console.error(`${survived} mutant(s) survived — the rule tests have blind spots.`);
  process.exit(1);
}
