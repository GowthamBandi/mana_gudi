"use client";

/**
 * The donation lifecycle.
 *
 * Each function here mirrors a transition the security rules already enforce.
 * The duplication is intentional: this layer gives the treasurer a clear error
 * message before a request is sent, while the rules give the temple a guarantee
 * that holds even if this layer is bypassed entirely.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { assertValidLedgerAmount } from "@/lib/domain/money";
import { evaluateTransition } from "@/lib/domain/financial-state";
import { assertNoPrivateFields, publicDisplayName } from "@/lib/domain/donor-privacy";
import { receiptNumber } from "@/lib/domain/ids";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import { recordAudit } from "./audit";
import type { Donation, Fund, PublicDonation, Revision } from "./types";

export class WorkflowError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function requirePermission(actor: AdminIdentity, permission: Parameters<typeof can>[1]): void {
  if (!can(actor, permission)) {
    throw new WorkflowError("You do not have permission to do this.", "MISSING_PERMISSION");
  }
}

async function loadDonation(id: string): Promise<Donation> {
  const snapshot = await getDoc(doc(db(), "donations", id));
  if (!snapshot.exists()) throw new WorkflowError("Donation not found.", "NOT_FOUND");
  return { id: snapshot.id, ...snapshot.data() } as Donation;
}

/**
 * Allocates the next receipt number inside a transaction so that two treasurers
 * entering donations at the same moment cannot be issued the same receipt.
 */
async function allocateReceiptNumber(year: number): Promise<string> {
  // The counter lives in /counters, not /config: allocating a receipt number is
  // an everyday treasurer action, whereas /config is super-admin territory.
  // The rules require seq to advance by exactly one, so a receipt number can
  // never be issued twice even if this code were replaced.
  const counterRef = doc(db(), "counters", `donations-${year}`);
  return runTransaction(db(), async (tx) => {
    const snapshot = await tx.get(counterRef);
    const next = ((snapshot.exists() ? (snapshot.data().seq as number) : 0) || 0) + 1;
    tx.set(counterRef, { seq: next });
    return receiptNumber(year, next);
  });
}

export interface NewDonationInput {
  donorName: string;
  donorPhone?: string | null;
  donorEmail?: string | null;
  donorAddress?: string | null;
  displayPreference: Donation["displayPreference"];
  amountPaise: number;
  purpose: string;
  fundId: string;
  occurredAt: Date;
  paymentMethod: Donation["paymentMethod"];
  referenceNo?: string | null;
  supportingDocPath?: string | null;
}

export async function createDonation(
  actor: AdminIdentity,
  input: NewDonationInput,
): Promise<{ id: string; receiptNo: string }> {
  requirePermission(actor, "donation:create");
  assertValidLedgerAmount(input.amountPaise);

  if (!input.donorName.trim()) {
    throw new WorkflowError("Donor name is required.", "VALIDATION");
  }
  if (!input.fundId) {
    throw new WorkflowError("Choose which fund this donation belongs to.", "VALIDATION");
  }

  const year = input.occurredAt.getFullYear();
  const receiptNo = await allocateReceiptNumber(year);
  const ref = doc(collection(db(), "donations"));

  const record = {
    receiptNo,
    donorName: input.donorName.trim(),
    donorPhone: input.donorPhone?.trim() || null,
    donorEmail: input.donorEmail?.trim() || null,
    donorAddress: input.donorAddress?.trim() || null,
    displayPreference: input.displayPreference,
    amountPaise: input.amountPaise,
    currency: "INR" as const,
    purpose: input.purpose,
    fundId: input.fundId,
    occurredAt: input.occurredAt,
    paymentMethod: input.paymentMethod,
    referenceNo: input.referenceNo?.trim() || null,
    supportingDocPath: input.supportingDocPath || null,
    status: "PUBLISHED" as const,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    submittedBy: actor.uid,
    verifiedBy: null,
    verifiedAt: null,
    publishedBy: actor.uid,
    publishedAt: serverTimestamp(),
    rejectionReason: null,
    lastCorrectionReason: null,
    revisionCount: 0,
  };

  await setDoc(ref, record);

  await recordAudit(actor, {
    action: "DONATION_CREATED",
    resourceType: "donation",
    resourceId: ref.id,
    summary: `Recorded and published donation ${receiptNo} for ${input.donorName}`,
    after: { receiptNo, amountPaise: input.amountPaise, status: "PUBLISHED" },
  });

  // Write public projection immediately so public transparency reflects the donation instantly
  await publishDonation(actor, ref.id);

  return { id: ref.id, receiptNo };
}

export async function submitDonation(actor: AdminIdentity, id: string): Promise<void> {
  const donation = await loadDonation(id);
  guardTransition(actor, donation, "SUBMITTED");

  await updateDoc(doc(db(), "donations", id), {
    status: "SUBMITTED",
    submittedBy: actor.uid,
  });
  await recordAudit(actor, {
    action: "DONATION_SUBMITTED",
    resourceType: "donation",
    resourceId: id,
    summary: `Submitted ${donation.receiptNo} for verification`,
    before: { status: donation.status },
    after: { status: "SUBMITTED" },
  });
}

export async function verifyDonation(actor: AdminIdentity, id: string): Promise<void> {
  const donation = await loadDonation(id);
  guardTransition(actor, donation, "VERIFIED");

  await updateDoc(doc(db(), "donations", id), {
    status: "VERIFIED",
    verifiedBy: actor.uid,
    verifiedAt: serverTimestamp(),
  });
  await recordAudit(actor, {
    action: "DONATION_VERIFIED",
    resourceType: "donation",
    resourceId: id,
    summary: `Verified ${donation.receiptNo} (created by another administrator)`,
    before: { status: donation.status },
    after: { status: "VERIFIED", verifiedBy: actor.uid },
  });
}

export async function rejectDonation(
  actor: AdminIdentity,
  id: string,
  reason: string,
): Promise<void> {
  const donation = await loadDonation(id);
  guardTransition(actor, donation, "REJECTED", reason);

  await updateDoc(doc(db(), "donations", id), {
    status: "REJECTED",
    rejectionReason: reason,
  });
  await recordAudit(actor, {
    action: "DONATION_REJECTED",
    resourceType: "donation",
    resourceId: id,
    summary: `Sent ${donation.receiptNo} back to the creator`,
    reason,
    before: { status: donation.status },
    after: { status: "REJECTED" },
  });
}

/**
 * Publication writes the internal status and the public projection together.
 * The projection is built from scratch by `toPublicProjection`, never by
 * spreading the internal document, so a new private field added later cannot
 * leak into public view by accident.
 */
export async function publishDonation(actor: AdminIdentity, id: string): Promise<void> {
  const donation = await loadDonation(id);

  // These two writes CANNOT be batched. Firestore evaluates every write in a
  // batch against the state before the batch, so the security rule guarding the
  // public projection ("the source record must already be PUBLISHED") would
  // still see VERIFIED and refuse. The internal status must therefore land
  // first, and only then may the projection be written.
  //
  // The cost of that ordering is a window where the record is published
  // internally but not yet visible publicly, so this function is idempotent:
  // running it again on an already-published record simply re-writes the
  // projection, which is exactly the repair a treasurer needs.
  const alreadyPublished = donation.status === "PUBLISHED";

  if (!alreadyPublished) {
    guardTransition(actor, donation, "PUBLISHED");
    await updateDoc(doc(db(), "donations", id), {
      status: "PUBLISHED",
      publishedBy: actor.uid,
      publishedAt: serverTimestamp(),
    });
  } else if (!can(actor, "donation:publish")) {
    throw new WorkflowError("You may not publish records.", "MISSING_PERMISSION");
  }

  const fund = await loadFund(donation.fundId);
  const projection = toPublicProjection({ ...donation, status: "PUBLISHED" }, fund?.name ?? "General Fund");

  let projectionWritten = false;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await setDoc(doc(db(), "public_donations", id), projection);
      projectionWritten = true;
      break;
    } catch (err) {
      lastError = err;
      await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
    }
  }

  if (!projectionWritten) {
    throw new WorkflowError(
      `${donation.receiptNo} was saved, but the public transparency copy failed to publish. ` +
        `Error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      "PROJECTION_FAILED",
    );
  }

  await recordAudit(actor, {
    action: "DONATION_PUBLISHED",
    resourceType: "donation",
    resourceId: id,
    summary: alreadyPublished
      ? `Re-synced the public copy of ${donation.receiptNo}`
      : `Published ${donation.receiptNo} to the public ledger`,
    before: { status: donation.status },
    after: { status: "PUBLISHED" },
  });
}

export function toPublicProjection(
  donation: Donation,
  fundName: string,
): Omit<PublicDonation, "id"> {
  const projection = {
    receiptNo: donation.receiptNo,
    displayName: publicDisplayName(donation.donorName, donation.displayPreference),
    amountPaise: donation.amountPaise,
    currency: "INR" as const,
    purpose: donation.purpose,
    fundId: donation.fundId,
    fundName,
    occurredAt: donation.occurredAt,
    publishedAt: new Date(),
    paymentMethod: donation.paymentMethod,
    revisionCount: donation.revisionCount,
    corrected: donation.revisionCount > 0,
    status: "PUBLISHED" as const,
  };

  // Belt and braces: the rules reject private fields, but failing here names
  // the offending field instead of returning an opaque PERMISSION_DENIED.
  assertNoPrivateFields(projection as unknown as Record<string, unknown>);
  return projection;
}

/**
 * Corrects a locked financial record.
 *
 * Step 1 writes an immutable revision recording what the record says *now*.
 * Step 2 changes the record. The security rules refuse step 2 unless step 1
 * already happened and tells the truth, which is what makes silent alteration
 * of temple finances impossible rather than merely discouraged.
 *
 * A public correction notice is also written, so the change is visible to the
 * village and not only to auditors.
 */
export async function correctDonation(
  actor: AdminIdentity,
  id: string,
  changes: { amountPaise?: number; purpose?: string; donorName?: string },
  reason: string,
): Promise<void> {
  const donation = await loadDonation(id);

  if (changes.amountPaise !== undefined) assertValidLedgerAmount(changes.amountPaise);

  const decision = evaluateTransition(donation.status, donation.status, {
    kind: "donation",
    actorUid: actor.uid,
    actorRole: actor.role,
    actorStatus: actor.status,
    createdBy: donation.createdBy,
    reason,
    revisionWitnessed: true, // step 1 below satisfies this
  });
  if (!decision.ok) throw new WorkflowError(decision.reason, decision.code);

  const nextRevision = donation.revisionCount + 1;

  // Step 1 — record the truth before changing it.
  await setDoc(doc(db(), "donations", id, "revisions", String(nextRevision)), {
    snapshot: {
      amountPaise: donation.amountPaise,
      status: donation.status,
      revisionCount: donation.revisionCount,
      purpose: donation.purpose,
      donorName: donation.donorName,
      receiptNo: donation.receiptNo,
    },
    reason,
    correctedBy: actor.uid,
    correctedAt: serverTimestamp(),
  });

  // Step 2 — now the visible record may move.
  await updateDoc(doc(db(), "donations", id), {
    ...(changes.amountPaise !== undefined ? { amountPaise: changes.amountPaise } : {}),
    ...(changes.purpose !== undefined ? { purpose: changes.purpose } : {}),
    ...(changes.donorName !== undefined ? { donorName: changes.donorName } : {}),
    revisionCount: nextRevision,
    lastCorrectionReason: reason,
  });

  // Step 3 — tell the public, permanently.
  if (donation.status === "PUBLISHED") {
    const fund = await loadFund(donation.fundId);
    const updated = { ...donation, ...changes, revisionCount: nextRevision };
    const batch = writeBatch(db());
    batch.set(
      doc(db(), "public_donations", id),
      toPublicProjection(updated as Donation, fund?.name ?? "General Fund"),
    );
    batch.set(doc(collection(db(), "public_corrections")), {
      recordType: "donation",
      recordId: id,
      publicRef: donation.receiptNo,
      fromAmountPaise: donation.amountPaise,
      toAmountPaise: changes.amountPaise ?? donation.amountPaise,
      reason,
      correctedAt: new Date(),
      revisionNumber: nextRevision,
    });
    await batch.commit();
  }

  await recordAudit(actor, {
    action: "DONATION_CORRECTED",
    resourceType: "donation",
    resourceId: id,
    summary: `Corrected ${donation.receiptNo} (revision ${nextRevision})`,
    reason,
    before: { amountPaise: donation.amountPaise, purpose: donation.purpose },
    after: { amountPaise: changes.amountPaise ?? donation.amountPaise, revisionCount: nextRevision },
  });
}

function guardTransition(
  actor: AdminIdentity,
  donation: Donation,
  to: Donation["status"],
  reason?: string,
): void {
  const decision = evaluateTransition(donation.status, to, {
    kind: "donation",
    actorUid: actor.uid,
    actorRole: actor.role,
    actorStatus: actor.status,
    createdBy: donation.createdBy,
    reason,
  });
  if (!decision.ok) throw new WorkflowError(decision.reason, decision.code);
}

async function loadFund(fundId: string): Promise<Fund | null> {
  const snapshot = await getDoc(doc(db(), "funds", fundId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Fund) : null;
}

// ------------------------------------------------------------------ queries

export interface PageOptions {
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
}

/**
 * Paginated listing. The admin donation list never fetches the whole
 * collection — an unbounded read is both a cost problem and a latency problem
 * once the temple has years of history.
 */
export async function listDonations(
  status: Donation["status"] | "ALL",
  options: PageOptions = {},
): Promise<{ items: Donation[]; cursor: DocumentSnapshot | null }> {
  const pageSize = options.pageSize ?? 25;
  const constraints: QueryConstraint[] = [];
  if (status !== "ALL") constraints.push(where("status", "==", status));
  constraints.push(orderBy("createdAt", "desc"));
  if (options.cursor) constraints.push(startAfter(options.cursor));
  constraints.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(collection(db(), "donations"), ...constraints));
  return {
    items: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Donation),
    cursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null,
  };
}

export async function listRevisions(donationId: string): Promise<Revision[]> {
  const snapshot = await getDocs(
    query(collection(db(), "donations", donationId, "revisions"), orderBy("correctedAt", "asc")),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Revision);
}

export { loadDonation };
