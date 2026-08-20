/**
 * Storage Security Rules Verification & Red-Team Attack Suite.
 *
 * Tests storage access control for public media, private documents, invoices,
 * receipts, hundi count photos, and path traversal/unclaimed path access.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { UIDS, createTestEnv, seedAdmins } from "./harness";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe.skipIf(!process.env.TEST_STORAGE)("Storage Security Rules", () => {
  describe("public media path (/public/**)", () => {
    it("allows anonymous public download of public images", async () => {
      const anonCtx = env.authenticatedContext("anonymous-user");
      const storage = anonCtx.storage();
      const fileRef = ref(storage, "public/festivals/banner.jpg");

      // Reading a non-existent public file or existing public file allowed by rules
      await assertSucceeds(getBytes(fileRef));
    });

    it("blocks anonymous users from uploading to /public/", async () => {
      const anonCtx = env.authenticatedContext("anonymous-user");
      const storage = anonCtx.storage();
      const fileRef = ref(storage, "public/evil.jpg");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertFails(uploadBytes(fileRef, dummyData, { contentType: "image/jpeg" }));
    });

    it("blocks non-content admins from uploading to /public/", async () => {
      const financeCtx = env.authenticatedContext(UIDS.finance1);
      const storage = financeCtx.storage();
      const fileRef = ref(storage, "public/festivals/banner.jpg");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertFails(uploadBytes(fileRef, dummyData, { contentType: "image/jpeg" }));
    });

    it("allows CONTENT_ADMIN to upload valid public images", async () => {
      const contentCtx = env.authenticatedContext(UIDS.contentAdmin);
      const storage = contentCtx.storage();
      const fileRef = ref(storage, "public/festivals/banner.jpg");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertSucceeds(uploadBytes(fileRef, dummyData, { contentType: "image/jpeg" }));
    });
  });

  describe("financial receipts & invoices (/receipts/**, /invoices/**)", () => {
    it("blocks anonymous download of financial receipts", async () => {
      const anonCtx = env.unauthenticatedContext();
      const storage = anonCtx.storage();
      const fileRef = ref(storage, "receipts/REC-2026-00001.pdf");

      await assertFails(getBytes(fileRef));
    });

    it("blocks EVENT_ADMIN from reading financial receipts", async () => {
      const eventCtx = env.authenticatedContext(UIDS.eventAdmin);
      const storage = eventCtx.storage();
      const fileRef = ref(storage, "receipts/REC-2026-00001.pdf");

      await assertFails(getBytes(fileRef));
    });

    it("allows AUDITOR to read financial receipts", async () => {
      const auditorCtx = env.authenticatedContext(UIDS.auditor);
      const storage = auditorCtx.storage();
      const fileRef = ref(storage, "receipts/REC-2026-00001.pdf");

      await assertSucceeds(getBytes(fileRef));
    });

    it("allows FINANCE_ADMIN to upload financial invoices", async () => {
      const financeCtx = env.authenticatedContext(UIDS.finance1);
      const storage = financeCtx.storage();
      const fileRef = ref(storage, "invoices/EXP-2026-00001.pdf");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertSucceeds(uploadBytes(fileRef, dummyData, { contentType: "application/pdf" }));
    });

    it("blocks AUDITOR from uploading financial invoices", async () => {
      const auditorCtx = env.authenticatedContext(UIDS.auditor);
      const storage = auditorCtx.storage();
      const fileRef = ref(storage, "invoices/EXP-2026-00001.pdf");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertFails(uploadBytes(fileRef, dummyData, { contentType: "application/pdf" }));
    });
  });

  describe("private documents (/documents/private/**)", () => {
    it("blocks anonymous users from reading private documents", async () => {
      const anonCtx = env.unauthenticatedContext();
      const storage = anonCtx.storage();
      const fileRef = ref(storage, "documents/private/trust-deed-audit.pdf");

      await assertFails(getBytes(fileRef));
    });

    it("allows active admins to read private documents", async () => {
      const adminCtx = env.authenticatedContext(UIDS.eventAdmin);
      const storage = adminCtx.storage();
      const fileRef = ref(storage, "documents/private/trust-deed-audit.pdf");

      await assertSucceeds(getBytes(fileRef));
    });

    it("blocks suspended admins from reading private documents", async () => {
      const suspendedCtx = env.authenticatedContext(UIDS.suspendedFinance);
      const storage = suspendedCtx.storage();
      const fileRef = ref(storage, "documents/private/trust-deed-audit.pdf");

      await assertFails(getBytes(fileRef));
    });
  });

  describe("unclaimed / arbitrary root paths", () => {
    it("blocks uploads to root or arbitrary paths", async () => {
      const superCtx = env.authenticatedContext(UIDS.superAdmin);
      const storage = superCtx.storage();
      const fileRef = ref(storage, "arbitrary-root-file.txt");

      const dummyData = new Uint8Array([1, 2, 3]);
      await assertFails(uploadBytes(fileRef, dummyData, { contentType: "text/plain" }));
    });
  });
});
