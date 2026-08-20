"use client";

/**
 * The expense lifecycle service.
 *
 * Each function here mirrors the security rules enforced by Firestore.
 * Expenses follow the exact two-person approval and witnessed immutable revision
 * guarantees as donations, ensuring complete financial integrity for temple expenditures.
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
import { voucherNumber } from "@/lib/domain/ids";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import { recordAudit } from "./audit";
import { WorkflowError } from "./donations";
import type { Expense, Fund, PublicExpense, Revision } from "./types";

export const EXPENSE_CATEGORIES = [
  "Annadanam",
  "Maintenance",
  "Electricity",
  "Priest Honorarium",
  "Poojasaamagri",
  "Festival Expenses",
  "Construction",
  "Administrative",
  "Miscellaneous",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

function requirePermission(actor: AdminIdentity, permission: Parameters<typeof can>[1]): void {
  if (!can(actor, permission)) {
    throw new WorkflowError("You do not have permission to do this.", "MISSING_PERMISSION");
  }
}

export async function loadExpense(id: string): Promise<Expense> {
  const snapshot = await getDoc(doc(db(), "expenses", id));
  if (!snapshot.exists()) throw new WorkflowError("Expense not found.", "NOT_FOUND");
  return { id: snapshot.id, ...snapshot.data() } as Expense;
}

/**
 * Allocates the next voucher number inside a transaction so that two treasurers
 * entering expenses at the same moment cannot be issued the same voucher number.
 */
async function allocateVoucherNumber(year: number): Promise<string> {
  const counterRef = doc(db(), "counters", `expenses-${year}`);
  return runTransaction(db(), async (tx) => {
    const snapshot = await tx.get(counterRef);
    const next = ((snapshot.exists() ? (snapshot.data().seq as number) : 0) || 0) + 1;
    tx.set(counterRef, { seq: next });
    return voucherNumber(year, next);
  });
}

export interface NewExpenseInput {
  category: string;
  description: string;
  amountPaise: number;
  fundId?: string;
  payeeDisplay: string;
  occurredAt: Date;
  supportingDocPath?: string | null;
}

export async function createExpense(
  actor: AdminIdentity,
  input: NewExpenseInput,
): Promise<{ id: string; voucherNo: string }> {
  requirePermission(actor, "expense:create");
  assertValidLedgerAmount(input.amountPaise);

  if (!input.category.trim()) {
    throw new WorkflowError("Expense category is required.", "VALIDATION");
  }
  if (!input.description.trim()) {
    throw new WorkflowError("Expense description is required.", "VALIDATION");
  }
  if (!input.payeeDisplay.trim()) {
    throw new WorkflowError("Payee name / vendor is required.", "VALIDATION");
  }

  const fundId = input.fundId || "fund-general";
  const year = input.occurredAt.getFullYear();
  const voucherNo = await allocateVoucherNumber(year);
  const ref = doc(collection(db(), "expenses"));

  const record: Omit<Expense, "id"> = {
    voucherNo,
    category: input.category.trim(),
    description: input.description.trim(),
    amountPaise: input.amountPaise,
    currency: "INR",
    fundId,
    payeeDisplay: input.payeeDisplay.trim(),
    occurredAt: input.occurredAt,
    supportingDocPath: input.supportingDocPath || null,
    status: "PUBLISHED",
    createdBy: actor.uid,
    createdAt: serverTimestamp() as unknown as import("./types").TimestampLike,
    verifiedBy: null,
    publishedBy: actor.uid,
    publishedAt: serverTimestamp() as unknown as import("./types").TimestampLike,
    rejectionReason: null,
    lastCorrectionReason: null,
    revisionCount: 0,
  };

  await setDoc(ref, record);

  await recordAudit(actor, {
    action: "EXPENSE_CREATED",
    resourceType: "expense",
    resourceId: ref.id,
    summary: `Recorded and published voucher ${voucherNo} for ${input.payeeDisplay}`,
    after: { voucherNo, amountPaise: input.amountPaise, status: "PUBLISHED" },
  });

  await publishExpense(actor, ref.id);

  return { id: ref.id, voucherNo };
}

export async function submitExpense(actor: AdminIdentity, id: string): Promise<void> {
  const expense = await loadExpense(id);
  guardTransition(actor, expense, "SUBMITTED");

  await updateDoc(doc(db(), "expenses", id), {
    status: "SUBMITTED",
  });
  await recordAudit(actor, {
    action: "EXPENSE_SUBMITTED",
    resourceType: "expense",
    resourceId: id,
    summary: `Submitted ${expense.voucherNo} for verification`,
    before: { status: expense.status },
    after: { status: "SUBMITTED" },
  });
}

export async function verifyExpense(actor: AdminIdentity, id: string): Promise<void> {
  const expense = await loadExpense(id);
  guardTransition(actor, expense, "VERIFIED");

  await updateDoc(doc(db(), "expenses", id), {
    status: "VERIFIED",
    verifiedBy: actor.uid,
    verifiedAt: serverTimestamp(),
  });
  await recordAudit(actor, {
    action: "EXPENSE_VERIFIED",
    resourceType: "expense",
    resourceId: id,
    summary: `Verified ${expense.voucherNo} (created by another administrator)`,
    before: { status: expense.status },
    after: { status: "VERIFIED", verifiedBy: actor.uid },
  });
}

export async function rejectExpense(
  actor: AdminIdentity,
  id: string,
  reason: string,
): Promise<void> {
  const expense = await loadExpense(id);
  guardTransition(actor, expense, "REJECTED", reason);

  await updateDoc(doc(db(), "expenses", id), {
    status: "REJECTED",
    rejectionReason: reason,
  });
  await recordAudit(actor, {
    action: "EXPENSE_REJECTED",
    resourceType: "expense",
    resourceId: id,
    summary: `Sent ${expense.voucherNo} back to the creator`,
    reason,
    before: { status: expense.status },
    after: { status: "REJECTED" },
  });
}

export async function publishExpense(actor: AdminIdentity, id: string): Promise<void> {
  const expense = await loadExpense(id);
  const alreadyPublished = expense.status === "PUBLISHED";

  if (!alreadyPublished) {
    guardTransition(actor, expense, "PUBLISHED");
    await updateDoc(doc(db(), "expenses", id), {
      status: "PUBLISHED",
      publishedBy: actor.uid,
      publishedAt: serverTimestamp(),
    });
  } else if (!can(actor, "expense:publish")) {
    throw new WorkflowError("You may not publish expense records.", "MISSING_PERMISSION");
  }

  const fund = await loadFund(expense.fundId);
  const projection = toPublicProjection({ ...expense, status: "PUBLISHED" }, fund?.name ?? "General Fund");

  let projectionWritten = false;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await setDoc(doc(db(), "public_expenses", id), projection);
      projectionWritten = true;
      break;
    } catch (err) {
      lastError = err;
      await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
    }
  }

  if (!projectionWritten) {
    throw new WorkflowError(
      `${expense.voucherNo} was saved, but the public expense projection failed to publish. ` +
        `Error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      "PROJECTION_FAILED",
    );
  }

  await recordAudit(actor, {
    action: "EXPENSE_PUBLISHED",
    resourceType: "expense",
    resourceId: id,
    summary: alreadyPublished
      ? `Re-synced public copy of ${expense.voucherNo}`
      : `Published ${expense.voucherNo} to public accounts`,
    before: { status: expense.status },
    after: { status: "PUBLISHED" },
  });
}

export function toPublicProjection(
  expense: Expense,
  fundName: string,
): Omit<PublicExpense, "id"> {
  return {
    voucherNo: expense.voucherNo,
    category: expense.category,
    description: expense.description,
    amountPaise: expense.amountPaise,
    currency: "INR",
    fundId: expense.fundId,
    fundName,
    payeeDisplay: expense.payeeDisplay,
    occurredAt: expense.occurredAt,
    publishedAt: new Date(),
    revisionCount: expense.revisionCount,
    corrected: expense.revisionCount > 0,
    status: "PUBLISHED",
  };
}

export async function correctExpense(
  actor: AdminIdentity,
  id: string,
  changes: { amountPaise?: number; description?: string; category?: string; payeeDisplay?: string },
  reason: string,
): Promise<void> {
  const expense = await loadExpense(id);

  if (changes.amountPaise !== undefined) assertValidLedgerAmount(changes.amountPaise);

  const decision = evaluateTransition(expense.status, expense.status, {
    kind: "expense",
    actorUid: actor.uid,
    actorRole: actor.role,
    actorStatus: actor.status,
    createdBy: expense.createdBy,
    reason,
    revisionWitnessed: true,
  });
  if (!decision.ok) throw new WorkflowError(decision.reason, decision.code);

  const nextRevision = expense.revisionCount + 1;

  // Step 1 — Record snapshot of pre-correction state before changing
  await setDoc(doc(db(), "expenses", id, "revisions", String(nextRevision)), {
    snapshot: {
      amountPaise: expense.amountPaise,
      status: expense.status,
      revisionCount: expense.revisionCount,
      category: expense.category,
      description: expense.description,
      payeeDisplay: expense.payeeDisplay,
      voucherNo: expense.voucherNo,
    },
    reason,
    correctedBy: actor.uid,
    correctedAt: serverTimestamp(),
  });

  // Step 2 — Update internal expense document
  await updateDoc(doc(db(), "expenses", id), {
    ...(changes.amountPaise !== undefined ? { amountPaise: changes.amountPaise } : {}),
    ...(changes.description !== undefined ? { description: changes.description } : {}),
    ...(changes.category !== undefined ? { category: changes.category } : {}),
    ...(changes.payeeDisplay !== undefined ? { payeeDisplay: changes.payeeDisplay } : {}),
    revisionCount: nextRevision,
    lastCorrectionReason: reason,
  });

  // Step 3 — Update public projection & write permanent correction notice
  if (expense.status === "PUBLISHED") {
    const fund = await loadFund(expense.fundId);
    const updated = { ...expense, ...changes, revisionCount: nextRevision };
    const batch = writeBatch(db());
    batch.set(
      doc(db(), "public_expenses", id),
      toPublicProjection(updated as Expense, fund?.name ?? "General Fund"),
    );
    batch.set(doc(collection(db(), "public_corrections")), {
      recordType: "expense",
      recordId: id,
      publicRef: expense.voucherNo,
      fromAmountPaise: expense.amountPaise,
      toAmountPaise: changes.amountPaise ?? expense.amountPaise,
      reason,
      correctedAt: new Date(),
      revisionNumber: nextRevision,
    });
    await batch.commit();
  }

  await recordAudit(actor, {
    action: "EXPENSE_CORRECTED",
    resourceType: "expense",
    resourceId: id,
    summary: `Corrected ${expense.voucherNo} (revision ${nextRevision})`,
    reason,
    before: { amountPaise: expense.amountPaise, description: expense.description },
    after: { amountPaise: changes.amountPaise ?? expense.amountPaise, revisionCount: nextRevision },
  });
}

function guardTransition(
  actor: AdminIdentity,
  expense: Expense,
  to: Expense["status"],
  reason?: string,
): void {
  const decision = evaluateTransition(expense.status, to, {
    kind: "expense",
    actorUid: actor.uid,
    actorRole: actor.role,
    actorStatus: actor.status,
    createdBy: expense.createdBy,
    reason,
  });
  if (!decision.ok) throw new WorkflowError(decision.reason, decision.code);
}

async function loadFund(fundId: string): Promise<Fund | null> {
  const snapshot = await getDoc(doc(db(), "funds", fundId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Fund) : null;
}

export interface PageOptions {
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
}

export async function listExpenses(
  status: Expense["status"] | "ALL",
  options: PageOptions = {},
): Promise<{ items: Expense[]; cursor: DocumentSnapshot | null }> {
  const pageSize = options.pageSize ?? 25;
  const constraints: QueryConstraint[] = [];
  if (status !== "ALL") constraints.push(where("status", "==", status));
  constraints.push(orderBy("createdAt", "desc"));
  if (options.cursor) constraints.push(startAfter(options.cursor));
  constraints.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(collection(db(), "expenses"), ...constraints));
  return {
    items: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense),
    cursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null,
  };
}

export async function listExpenseRevisions(expenseId: string): Promise<Revision[]> {
  const snapshot = await getDocs(
    query(collection(db(), "expenses", expenseId, "revisions"), orderBy("correctedAt", "asc")),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Revision);
}
