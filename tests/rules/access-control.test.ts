/**
 * Attacks on authorization: privilege escalation, cross-role access, audit
 * tampering, PII exposure and the treatment of deactivated accounts.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { UIDS, asAnonymous, asUser, createTestEnv, donationDoc, seed, seedAdmins } from "./harness";

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

describe("the anonymous public", () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc("donations/d1").set(donationDoc({ status: "PUBLISHED" }));
      await db.doc("public_donations/d1").set({
        receiptNo: "DON-2026-00001",
        displayName: "Ramesh Kumar",
        amountPaise: 1_000_000,
        currency: "INR",
        purpose: "Annadanam",
        fundId: "fund-annadanam",
        fundName: "Annadanam Fund",
        occurredAt: new Date(),
        publishedAt: new Date(),
        paymentMethod: "UPI",
        revisionCount: 0,
        corrected: false,
        status: "PUBLISHED",
      });
      await db.doc("audit_logs/a1").set({
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_PUBLISHED",
        resourceType: "donation",
        resourceId: "d1",
        at: new Date(),
      });
    });
  });

  it("can read the public ledger without an account", async () => {
    const db = asAnonymous(env).firestore();
    await assertSucceeds(getDoc(doc(db, "public_donations/d1")));
    await assertSucceeds(getDocs(collection(db, "public_donations")));
  });

  it("cannot reach the internal donation record behind it", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(getDoc(doc(db, "donations/d1")));
    await assertFails(getDocs(collection(db, "donations")));
  });

  it("cannot write to the public ledger", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(
      setDoc(doc(db, "public_donations/forged"), { amountPaise: 999, receiptNo: "X" }),
    );
    await assertFails(updateDoc(doc(db, "public_donations/d1"), { amountPaise: 1 }));
    await assertFails(deleteDoc(doc(db, "public_donations/d1")));
  });

  it("cannot read or write the audit log", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(getDoc(doc(db, "audit_logs/a1")));
    await assertFails(setDoc(doc(db, "audit_logs/forged"), { action: "X" }));
  });

  it("cannot enumerate administrators", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(getDocs(collection(db, "admin_users")));
    await assertFails(getDoc(doc(db, `admin_users/${UIDS.superAdmin}`)));
  });

  it("cannot read event registrations, which contain phone numbers", async () => {
    await seed(env, async (db) => {
      await db.doc("registrations/r1").set({
        eventId: "evt1",
        name: "Sita",
        phone: "9876543210",
        participantCount: 2,
        status: "CONFIRMED",
        createdAt: new Date(),
      });
    });
    const db = asAnonymous(env).firestore();
    await assertFails(getDoc(doc(db, "registrations/r1")));
    await assertFails(getDocs(collection(db, "registrations")));
  });

  it("cannot reach an unknown collection invented by an attacker", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(getDoc(doc(db, "secrets/master")));
    await assertFails(setDoc(doc(db, "secrets/master"), { x: 1 }));
    await assertFails(getDocs(collection(db, "backups")));
  });
});

describe("a signed-in user who is not an administrator", () => {
  it("gains nothing merely by holding an account", async () => {
    const db = asUser(env, UIDS.strangerAuthed).firestore();
    await assertFails(getDocs(collection(db, "donations")));
    await assertFails(setDoc(doc(db, "donations/x"), donationDoc()));
    await assertFails(getDocs(collection(db, "audit_logs")));
    await assertFails(getDocs(collection(db, "expenses")));
  });

  it("cannot promote itself by creating its own admin record", async () => {
    const db = asUser(env, UIDS.strangerAuthed).firestore();
    await assertFails(
      setDoc(doc(db, `admin_users/${UIDS.strangerAuthed}`), {
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        displayName: "Attacker",
        email: "a@b.c",
        createdBy: UIDS.strangerAuthed,
      }),
    );
  });
});

describe("privilege escalation", () => {
  it("stops an admin promoting themselves", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      updateDoc(doc(db, `admin_users/${UIDS.finance1}`), { role: "SUPER_ADMIN" }),
    );
  });

  it("stops an admin promoting a colleague", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      updateDoc(doc(db, `admin_users/${UIDS.finance2}`), { role: "SUPER_ADMIN" }),
    );
  });

  it("stops an auditor granting themselves write access", async () => {
    const db = asUser(env, UIDS.auditor).firestore();
    await assertFails(
      updateDoc(doc(db, `admin_users/${UIDS.auditor}`), { role: "FINANCE_ADMIN" }),
    );
  });

  it("stops a suspended admin reactivating themselves", async () => {
    const db = asUser(env, UIDS.suspendedFinance).firestore();
    await assertFails(
      updateDoc(doc(db, `admin_users/${UIDS.suspendedFinance}`), { status: "ACTIVE" }),
    );
  });

  it("stops even a super admin editing their own role record", async () => {
    // Prevents a lone super admin quietly demoting themselves out of an audit
    // obligation, or self-editing to dodge the two-person rule.
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(
      updateDoc(doc(db, `admin_users/${UIDS.superAdmin}`), { role: "AUDITOR" }),
    );
  });

  it("lets a super admin provision a genuine new administrator", async () => {
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertSucceeds(
      setDoc(doc(db, "admin_users/uid-new"), {
        role: "EVENT_ADMIN",
        status: "ACTIVE",
        displayName: "New Event Admin",
        email: "new@temple.test",
        createdBy: UIDS.superAdmin,
      }),
    );
  });

  it("refuses an invented role that is not in the model", async () => {
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(
      setDoc(doc(db, "admin_users/uid-new2"), {
        role: "GOD_MODE",
        status: "ACTIVE",
        displayName: "Escalated",
        email: "x@temple.test",
        createdBy: UIDS.superAdmin,
      }),
    );
  });

  it("never allows an administrator record to be deleted", async () => {
    const db = asUser(env, UIDS.superAdmin).firestore();
    await assertFails(deleteDoc(doc(db, `admin_users/${UIDS.finance1}`)));
  });
});

describe("a deactivated administrator", () => {
  it("loses all authority even with a valid session token", async () => {
    const db = asUser(env, UIDS.suspendedFinance).firestore();
    await assertFails(setDoc(doc(db, "donations/d9"), donationDoc({ createdBy: UIDS.suspendedFinance })));
    await assertFails(getDocs(collection(db, "donations")));
    await assertFails(
      addDoc(collection(db, "audit_logs"), {
        actorUid: UIDS.suspendedFinance,
        actorRole: "FINANCE_ADMIN",
        action: "TEST",
        resourceType: "donation",
        at: serverTimestamp(),
      }),
    );
  });
});

describe("cross-role boundaries", () => {
  it("keeps the event admin out of the finance ledger", async () => {
    const db = asUser(env, UIDS.eventAdmin).firestore();
    await assertFails(setDoc(doc(db, "donations/x"), donationDoc({ createdBy: UIDS.eventAdmin })));
    await assertFails(getDocs(collection(db, "donations")));
    await assertFails(getDocs(collection(db, "expenses")));
  });

  it("keeps the content admin out of the finance ledger", async () => {
    const db = asUser(env, UIDS.contentAdmin).firestore();
    await assertFails(getDocs(collection(db, "donations")));
    await assertFails(
      setDoc(doc(db, "public_donations/forged"), { amountPaise: 1, receiptNo: "X" }),
    );
  });

  it("keeps the finance admin out of event publishing", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      setDoc(doc(db, "public_events/e1"), {
        title: "Forged Festival",
        description: "x",
        deity: "x",
        eventType: "FESTIVAL",
        startAt: new Date(),
        endAt: new Date(),
        location: "x",
        capacity: 10,
        registrationRequired: false,
        registrationOpen: false,
        feePaise: 0,
        instructions: "",
        materials: "",
        status: "PUBLISHED",
        registrationCount: 0,
        updatedAt: new Date(),
      }),
    );
  });

  it("gives the auditor read access without any write access", async () => {
    await seed(env, async (db) => {
      await db.doc("donations/d1").set(donationDoc({ status: "PUBLISHED" }));
      await db.doc("audit_logs/a1").set({
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_PUBLISHED",
        resourceType: "donation",
        resourceId: "d1",
        at: new Date(),
      });
    });
    const db = asUser(env, UIDS.auditor).firestore();
    await assertSucceeds(getDoc(doc(db, "donations/d1")));
    await assertSucceeds(getDoc(doc(db, "audit_logs/a1")));
    await assertFails(updateDoc(doc(db, "donations/d1"), { amountPaise: 1 }));
    await assertFails(setDoc(doc(db, "donations/new"), donationDoc({ createdBy: UIDS.auditor })));
  });

  it("hides the audit log from a finance admin", async () => {
    await seed(env, async (db) => {
      await db.doc("audit_logs/a1").set({
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "X",
        resourceType: "donation",
        at: new Date(),
      });
    });
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(getDoc(doc(db, "audit_logs/a1")));
  });
});

describe("the audit log", () => {
  it("accepts a truthful entry from an active administrator", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertSucceeds(
      addDoc(collection(db, "audit_logs"), {
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_CREATED",
        resourceType: "donation",
        resourceId: "d1",
        at: serverTimestamp(),
      }),
    );
  });

  it("refuses an entry forged in another administrator's name", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      addDoc(collection(db, "audit_logs"), {
        actorUid: UIDS.finance2,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_DELETED",
        resourceType: "donation",
        at: serverTimestamp(),
      }),
    );
  });

  it("refuses an entry claiming a role the actor does not hold", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      addDoc(collection(db, "audit_logs"), {
        actorUid: UIDS.finance1,
        actorRole: "SUPER_ADMIN",
        action: "ROLE_CHANGED",
        resourceType: "admin_user",
        at: serverTimestamp(),
      }),
    );
  });

  it("refuses a backdated entry", async () => {
    const db = asUser(env, UIDS.finance1).firestore();
    await assertFails(
      addDoc(collection(db, "audit_logs"), {
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_CREATED",
        resourceType: "donation",
        at: new Date("2020-01-01T00:00:00Z"),
      }),
    );
  });

  it("cannot be edited or erased by anyone, including a super admin", async () => {
    await seed(env, async (db) => {
      await db.doc("audit_logs/a1").set({
        actorUid: UIDS.finance1,
        actorRole: "FINANCE_ADMIN",
        action: "DONATION_PUBLISHED",
        resourceType: "donation",
        at: new Date(),
      });
    });

    for (const uid of [UIDS.superAdmin, UIDS.finance1, UIDS.auditor]) {
      const db = asUser(env, uid).firestore();
      await assertFails(updateDoc(doc(db, "audit_logs/a1"), { action: "NOTHING_HAPPENED" }));
      await assertFails(deleteDoc(doc(db, "audit_logs/a1")));
    }
  });
});

describe("public participation without an account", () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc("public_events/evt1").set({
        title: "Maha Shivaratri Homam",
        description: "Annual homam",
        deity: "Lord Shiva",
        eventType: "HOMAM",
        startAt: new Date("2026-03-01T04:00:00Z"),
        endAt: new Date("2026-03-01T09:00:00Z"),
        location: "Main Mandapam",
        capacity: 100,
        registrationRequired: true,
        registrationOpen: true,
        feePaise: 0,
        instructions: "Arrive by 9am",
        materials: "",
        status: "PUBLISHED",
        registrationCount: 0,
        updatedAt: new Date(),
      });
    });
  });

  it("lets a villager register for a published event", async () => {
    const db = asAnonymous(env).firestore();
    await assertSucceeds(
      setDoc(doc(db, "registrations/evt1__abc123"), {
        eventId: "evt1",
        name: "Sita Devi",
        phone: "9876543210",
        participantCount: 2,
        status: "CONFIRMED",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("refuses a registration for an event that does not exist", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(
      setDoc(doc(db, "registrations/ghost__abc"), {
        eventId: "does-not-exist",
        name: "Sita Devi",
        phone: "9876543210",
        participantCount: 1,
        status: "CONFIRMED",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("refuses a registration that pre-declares a privileged status", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(
      setDoc(doc(db, "registrations/evt1__xyz"), {
        eventId: "evt1",
        name: "Sita Devi",
        phone: "9876543210",
        participantCount: 1,
        status: "ATTENDED",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("refuses an implausible participant count", async () => {
    const db = asAnonymous(env).firestore();
    await assertFails(
      setDoc(doc(db, "registrations/evt1__big"), {
        eventId: "evt1",
        name: "Bulk",
        phone: "9876543210",
        participantCount: 5000,
        status: "CONFIRMED",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("suppresses a duplicate registration through the derived document ID", async () => {
    const db = asAnonymous(env).firestore();
    const payload = {
      eventId: "evt1",
      name: "Sita Devi",
      phone: "9876543210",
      participantCount: 2,
      status: "CONFIRMED",
      createdAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(db, "registrations/evt1__dup"), payload));
    // A second submission of the same form is a create against an existing
    // document, which the rules refuse because only `create` is permitted.
    await assertFails(setDoc(doc(db, "registrations/evt1__dup"), payload));
  });

  it("lets a villager file a complaint and track it, but not browse others", async () => {
    const anon = asAnonymous(env).firestore();
    await assertSucceeds(
      setDoc(doc(anon, "feedback/FB-ABCDE-FGHJK"), {
        type: "COMPLAINT",
        message: "The water tap near the entrance is broken",
        status: "SUBMITTED",
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(anon, "feedback/FB-ABCDE-FGHJK")));
    await assertFails(getDocs(collection(anon, "feedback")));
  });

  it("keeps staff notes about a complainant out of public reach", async () => {
    await seed(env, async (db) => {
      await db.doc("feedback/FB-1/internal/note1").set({ note: "Known repeat complainant" });
    });
    const anon = asAnonymous(env).firestore();
    await assertFails(getDoc(doc(anon, "feedback/FB-1/internal/note1")));
  });
});

describe("document visibility", () => {
  it("refuses to publish a document that is not marked public", async () => {
    await seed(env, async (db) => {
      await db.doc("documents/secret").set({
        title: "Committee minutes",
        visibility: "RESTRICTED",
        storagePath: "documents/private/minutes.pdf",
      });
      await db.doc("documents/open").set({
        title: "Annual report 2026",
        visibility: "PUBLIC",
        storagePath: "documents/public/annual-2026.pdf",
      });
    });

    const db = asUser(env, UIDS.contentAdmin).firestore();
    const projection = {
      title: "Leaked minutes",
      category: "GOVERNANCE",
      storagePath: "documents/private/minutes.pdf",
      downloadUrl: "https://example.test/x",
      sizeBytes: 1024,
      contentType: "application/pdf",
      publishedAt: new Date(),
    };

    await assertFails(setDoc(doc(db, "public_documents/secret"), projection));
    await assertSucceeds(
      setDoc(doc(db, "public_documents/open"), { ...projection, title: "Annual report 2026" }),
    );
  });
});
