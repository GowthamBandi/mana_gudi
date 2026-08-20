/**
 * Attacks on the financial integrity guarantees.
 *
 * Every test here plays an attacker with a legitimate account trying to move
 * money or rewrite history in a way the temple committee would not sanction.
 * The client SDK is used exactly as a modified browser would use it.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import {
  UIDS,
  asUser,
  createTestEnv,
  donationDoc,
  expenseDoc,
  seed,
  seedAdmins,
} from "./harness";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
});

describe("creating a donation", () => {
  it("lets a finance admin create a draft", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(setDoc(doc(db, "donations/d1"), donationDoc()));
  });

  it("refuses a donation created straight into VERIFIED", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "donations/d1"), donationDoc({ status: "VERIFIED" })));
  });

  it("allows a donation created straight into PUBLISHED", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(setDoc(doc(db, "donations/d1"), donationDoc({ status: "PUBLISHED" })));
  });

  it("refuses a donation that arrives pre-verified by someone else", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/d1"), donationDoc({ verifiedBy: UIDS.finance2 })),
    );
  });

  it("refuses a record attributed to another administrator", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "donations/d1"), donationDoc({ createdBy: UIDS.finance2 })));
  });

  it("refuses zero, negative and fractional amounts", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "donations/z"), donationDoc({ amountPaise: 0 })));
    await assertFails(setDoc(doc(db, "donations/n"), donationDoc({ amountPaise: -50000 })));
    await assertFails(setDoc(doc(db, "donations/f"), donationDoc({ amountPaise: 10.5 })));
  });

  it("refuses an amount smuggled in as a string", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/s"), { ...donationDoc(), amountPaise: "1000000" }),
    );
  });

  it("refuses an absurd amount", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/big"), donationDoc({ amountPaise: 999_999_999_999 })),
    );
  });

  it("refuses a record starting with a non-zero revision count", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "donations/r"), donationDoc({ revisionCount: 7 })));
  });
});

describe("two-person verification", () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc("donations/d1").set(donationDoc({ status: "SUBMITTED" }));
    });
  });

  it("blocks the creator from verifying their own donation", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/d1"), { status: "VERIFIED", verifiedBy: UIDS.finance1 }),
    );
  });

  it("blocks self-verification even for a super admin", async () => {
    await seed(env, async (db) => {
      await db.doc("donations/d2").set(donationDoc({ status: "SUBMITTED", createdBy: UIDS.superAdmin }));
    });
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/d2"), { status: "VERIFIED", verifiedBy: UIDS.superAdmin }),
    );
  });

  it("blocks a creator who claims a colleague verified it", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/d1"), { status: "VERIFIED", verifiedBy: UIDS.finance2 }),
    );
  });

  it("allows a genuine second administrator to verify", async () => {
    const db = asUser(env, UIDS.finance2).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "donations/d1"), { status: "VERIFIED", verifiedBy: UIDS.finance2 }),
    );
  });

  it("blocks the amount being changed during verification", async () => {
    const db = asUser(env, UIDS.finance2).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/d1"), {
        status: "VERIFIED",
        verifiedBy: UIDS.finance2,
        amountPaise: 100,
      }),
    );
  });

  it("blocks skipping verification and publishing directly", async () => {
    const db = asUser(env, UIDS.finance2).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/d1"), { status: "PUBLISHED", publishedBy: UIDS.finance2 }),
    );
  });

  it("blocks a rejection without a reason", async () => {
    const db = asUser(env, UIDS.finance2).firestore();
    await assertFails(updateDoc(doc(db, "donations/d1"), { status: "REJECTED" }));
    await assertSucceeds(
      updateDoc(doc(db, "donations/d1"), {
        status: "REJECTED",
        rejectionReason: "Receipt does not match the counterfoil",
      }),
    );
  });
});

describe("no silent alteration of published history", () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc("donations/pub").set(
        donationDoc({
          status: "PUBLISHED",
          amountPaise: 1_000_000, // ₹10,000
          createdBy: UIDS.finance1,
          verifiedBy: UIDS.finance2,
        }),
      );
    });
  });

  it("refuses to quietly change ₹10,000 into ₹1,000", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(updateDoc(doc(db, "donations/pub"), { amountPaise: 100_000 }));
  });

  it("refuses even when the actor is a super admin", async () => {
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(updateDoc(doc(db, "donations/pub"), { amountPaise: 100_000 }));
  });

  it("refuses a change that merely claims a higher revision count", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      updateDoc(doc(db, "donations/pub"), {
        amountPaise: 100_000,
        revisionCount: 1,
        lastCorrectionReason: "typo",
      }),
    );
  });

  it("refuses a correction whose revision snapshot lies about the old value", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    // Attacker writes a revision claiming the record always said ₹1,000.
    await assertFails(
      setDoc(doc(db, "donations/pub/revisions/1"), {
        snapshot: { amountPaise: 100_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "covering tracks",
        correctedBy: UIDS.finance1,
        correctedAt: new Date(),
      }),
    );
  });

  it("refuses a revision attributed to another administrator", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/pub/revisions/1"), {
        snapshot: { amountPaise: 1_000_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "genuine correction",
        correctedBy: UIDS.finance2,
        correctedAt: new Date(),
      }),
    );
  });

  it("refuses a revision without a stated reason", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/pub/revisions/1"), {
        snapshot: { amountPaise: 1_000_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "",
        correctedBy: UIDS.finance1,
        correctedAt: new Date(),
      }),
    );
  });

  it("refuses a revision written out of sequence", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "donations/pub/revisions/5"), {
        snapshot: { amountPaise: 1_000_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "skipping ahead",
        correctedBy: UIDS.finance1,
        correctedAt: new Date(),
      }),
    );
  });

  it("permits a witnessed correction, and only then", async () => {
    const db = asUser(env, UIDS.finance1).firestore();

    // Step 1: permanently record what the figure used to be.
    await assertSucceeds(
      setDoc(doc(db, "donations/pub/revisions/1"), {
        snapshot: { amountPaise: 1_000_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "Counterfoil shows ₹8,000; ₹10,000 was keyed in error",
        correctedBy: UIDS.finance1,
        correctedAt: new Date(),
      }),
    );

    // Step 2: only now may the visible figure move.
    await assertSucceeds(
      updateDoc(doc(db, "donations/pub"), {
        amountPaise: 800_000,
        revisionCount: 1,
        lastCorrectionReason: "Counterfoil shows ₹8,000; ₹10,000 was keyed in error",
      }),
    );
  });

  it("makes the revision ledger permanently immutable", async () => {
    await seed(env, async (db) => {
      await db.doc("donations/pub/revisions/1").set({
        snapshot: { amountPaise: 1_000_000, status: "PUBLISHED", revisionCount: 0 },
        reason: "original correction",
        correctedBy: UIDS.finance1,
        correctedAt: new Date(),
      });
    });

    for (const uid of [UIDS.finance1, UIDS.superAdmin]) {
      const db = asUser(env, uid).firestore();
      await assertFails(
        updateDoc(doc(db, "donations/pub/revisions/1"), { reason: "rewritten" }),
      );
      await assertFails(deleteDoc(doc(db, "donations/pub/revisions/1")));
    }
  });

  it("never allows a financial record to be deleted, by anyone", async () => {
    for (const uid of [UIDS.finance1, UIDS.superAdmin, UIDS.auditor]) {
      const db = asUser(env, uid).firestore();
      await assertFails(deleteDoc(doc(db, "donations/pub")));
    }
  });

  it("applies the same protection to expenses", async () => {
    await seed(env, async (db) => {
      await db.doc("expenses/e1").set(
        expenseDoc({ status: "PUBLISHED", amountPaise: 500_000, verifiedBy: UIDS.finance2 }),
      );
    });
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(updateDoc(doc(db, "expenses/e1"), { amountPaise: 1000 }));
    await assertFails(deleteDoc(doc(db, "expenses/e1")));
  });
});

describe("public projections", () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc("donations/pub").set(
        donationDoc({ status: "PUBLISHED", amountPaise: 1_000_000, verifiedBy: UIDS.finance2 }),
      );
      await db.doc("donations/draft").set(donationDoc({ status: "DRAFT" }));
      await db.doc("donations/anon").set(
        donationDoc({
          status: "PUBLISHED",
          displayPreference: "ANONYMOUS",
          receiptNo: "DON-2026-00009",
          verifiedBy: UIDS.finance2,
        }),
      );
    });
  });

  const validProjection = {
    receiptNo: "DON-2026-00001",
    displayName: "Ramesh Kumar",
    amountPaise: 1_000_000,
    currency: "INR",
    purpose: "Annadanam",
    fundId: "fund-annadanam",
    fundName: "Annadanam Fund",
    occurredAt: new Date("2026-01-15T06:00:00Z"),
    publishedAt: new Date(),
    paymentMethod: "UPI",
    revisionCount: 0,
    corrected: false,
    status: "PUBLISHED",
  };

  it("publishes a projection that matches its source record", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(setDoc(doc(db, "public_donations/pub"), validProjection));
  });

  it("refuses a projection whose amount disagrees with the ledger", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "public_donations/pub"), { ...validProjection, amountPaise: 50 }),
    );
  });

  it("refuses to publish a donation that was never published internally", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "public_donations/draft"), validProjection));
  });

  it("physically cannot carry a donor phone number into public view", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "public_donations/pub"), {
        ...validProjection,
        donorPhone: "9876543210",
      }),
    );
  });

  it("blocks donor email and address from the public read model", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "public_donations/pub"), {
        ...validProjection,
        donorEmail: "ramesh@example.com",
      }),
    );
    await assertFails(
      setDoc(doc(db, "public_donations/pub"), {
        ...validProjection,
        donorAddress: "12 Temple Street",
      }),
    );
  });

  it("refuses to name a donor who asked to stay anonymous", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "public_donations/anon"), {
        ...validProjection,
        receiptNo: "DON-2026-00009",
        displayName: "Ramesh Kumar",
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "public_donations/anon"), {
        ...validProjection,
        receiptNo: "DON-2026-00009",
        displayName: "Anonymous Devotee",
      }),
    );
  });

  it("keeps the public correction record append-only", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    const correction = {
      recordType: "donation",
      recordId: "pub",
      publicRef: "DON-2026-00001",
      fromAmountPaise: 1_000_000,
      toAmountPaise: 800_000,
      reason: "keyed in error",
      correctedAt: new Date(),
      revisionNumber: 1,
    };
    await assertSucceeds(setDoc(doc(db, "public_corrections/c1"), correction));
    await assertFails(updateDoc(doc(db, "public_corrections/c1"), { reason: "hidden" }));
    await assertFails(deleteDoc(doc(db, "public_corrections/c1")));
  });
});

describe("receipt number allocation", () => {
  // Two receipts bearing the same number would make the public ledger
  // unverifiable: a devotee checking DON-2026-00001 could not tell which
  // donation they were looking at.
  it("lets a treasurer start a sequence at one", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(setDoc(doc(db, "counters/donations-2026"), { seq: 1 }));
  });

  it("refuses a sequence that does not start at one", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(setDoc(doc(db, "counters/donations-2026"), { seq: 500 }));
  });

  it("advances only one step at a time", async () => {
    await seed(env, async (db) => {
      await db.doc("counters/donations-2026").set({ seq: 5 });
    });
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(updateDoc(doc(db, "counters/donations-2026"), { seq: 6 }));
  });

  it("refuses to rewind a sequence, which would reissue a receipt number", async () => {
    await seed(env, async (db) => {
      await db.doc("counters/donations-2026").set({ seq: 5 });
    });
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(updateDoc(doc(db, "counters/donations-2026"), { seq: 1 }));
    await assertFails(updateDoc(doc(db, "counters/donations-2026"), { seq: 5 }));
    await assertFails(updateDoc(doc(db, "counters/donations-2026"), { seq: 99 }));
  });

  it("refuses a counter deletion, which would reset the sequence", async () => {
    await seed(env, async (db) => {
      await db.doc("counters/donations-2026").set({ seq: 5 });
    });
    for (const uid of [UIDS.finance1, UIDS.superAdmin]) {
      const db = asUser(env, uid).firestore();
      await assertFails(deleteDoc(doc(db, "counters/donations-2026")));
    }
  });

  it("keeps non-finance roles away from the sequence", async () => {
    const db = asUser(env, UIDS.eventAdmin).firestore();
    await assertFails(setDoc(doc(db, "counters/donations-2026"), { seq: 1 }));
  });
});

describe("hundi cash counting", () => {
  it("requires at least two counters to open a session", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "hundi_sessions/h1"), {
        status: "OPEN",
        openedBy: UIDS.finance1,
        counters: [UIDS.finance1],
        totalPaise: 0,
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "hundi_sessions/h2"), {
        status: "OPEN",
        openedBy: UIDS.finance1,
        counters: [UIDS.finance1, UIDS.finance2],
        totalPaise: 0,
      }),
    );
  });

  it("stops a counter from verifying their own count", async () => {
    await seed(env, async (db) => {
      await db.doc("hundi_sessions/h3").set({
        status: "COUNTED",
        openedBy: UIDS.finance1,
        counters: [UIDS.finance1, UIDS.finance2],
        totalPaise: 2_500_000,
      });
    });
    const counterDb = asUser(env, UIDS.finance2).firestore();
    await assertFails(
      updateDoc(doc(counterDb, "hundi_sessions/h3"), {
        status: "VERIFIED",
        verifiedBy: UIDS.finance2,
      }),
    );

    const independentDb = asUser(env, UIDS.superAdmin).firestore();
    await assertSucceeds(
      updateDoc(doc(independentDb, "hundi_sessions/h3"), {
        status: "VERIFIED",
        verifiedBy: UIDS.superAdmin,
      }),
    );
  });

  it("stops the counted total being altered at verification time", async () => {
    await seed(env, async (db) => {
      await db.doc("hundi_sessions/h4").set({
        status: "COUNTED",
        openedBy: UIDS.finance1,
        counters: [UIDS.finance1, UIDS.finance2],
        totalPaise: 2_500_000,
      });
    });
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(
      updateDoc(doc(db, "hundi_sessions/h4"), {
        status: "VERIFIED",
        verifiedBy: UIDS.superAdmin,
        totalPaise: 500_000,
      }),
    );
  });
});
