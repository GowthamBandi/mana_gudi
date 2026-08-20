"use client";

/**
 * Audit logging.
 *
 * Entries are append-only and self-attesting: the security rules require that
 * `actorUid` equals the caller's own uid, that `actorRole` equals the role
 * recorded in the administrator directory, and that `at` equals the server's
 * clock. An administrator therefore cannot forge an entry in a colleague's
 * name, claim a role they do not hold, or backdate an action.
 */

import { addDoc, collection, limit, orderBy, query, serverTimestamp, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AdminIdentity } from "@/lib/domain/rbac";
import type { AuditEntry } from "./types";

export type AuditAction =
  | "DONATION_CREATED"
  | "DONATION_SUBMITTED"
  | "DONATION_VERIFIED"
  | "DONATION_REJECTED"
  | "DONATION_PUBLISHED"
  | "DONATION_CORRECTED"
  | "DONATION_REVERSED"
  | "EXPENSE_CREATED"
  | "EXPENSE_SUBMITTED"
  | "EXPENSE_VERIFIED"
  | "EXPENSE_REJECTED"
  | "EXPENSE_PUBLISHED"
  | "EXPENSE_CORRECTED"
  | "HUNDI_SESSION_OPENED"
  | "HUNDI_COUNTED"
  | "HUNDI_VERIFIED"
  | "EVENT_CREATED"
  | "EVENT_PUBLISHED"
  | "EVENT_CANCELLED"
  | "EVENT_STATUS_CHANGED"
  | "ADMIN_CREATED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_SUSPENDED"
  | "DOCUMENT_PUBLISHED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "TEMPLE_PROFILE_UPDATED"
  | "LOGIN_SUCCEEDED"
  | "LOGIN_DENIED";

export interface AuditInput {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Fields that must never be copied into an audit entry, because audit logs are
 * readable by auditors who have no business seeing donor contact details.
 */
const REDACTED_FIELDS = new Set([
  "donorPhone",
  "donorEmail",
  "donorAddress",
  "donorPan",
  "phone",
  "email",
  "address",
  "referenceNo",
]);

export function redact(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    output[key] = REDACTED_FIELDS.has(key) ? "[redacted]" : value;
  }
  return output;
}

export async function recordAudit(actor: AdminIdentity, input: AuditInput): Promise<void> {
  await addDoc(collection(db(), "audit_logs"), {
    actorUid: actor.uid,
    actorRole: actor.role,
    actorName: actor.displayName,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    summary: input.summary,
    before: redact(input.before),
    after: redact(input.after),
    reason: input.reason ?? null,
    at: serverTimestamp(),
  });
}

/**
 * Audit writes must never silently vanish, but they also must not roll back a
 * financial action that already succeeded. Failures are surfaced to the caller
 * as a warning rather than thrown.
 */
export async function recordAuditSafely(
  actor: AdminIdentity,
  input: AuditInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await recordAudit(actor, input);
    return { ok: true };
  } catch (error) {
    console.error("Audit write failed", { action: input.action, error });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function recentAudit(count = 50): Promise<AuditEntry[]> {
  const snapshot = await getDocs(
    query(collection(db(), "audit_logs"), orderBy("at", "desc"), limit(count)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditEntry);
}

export async function auditForResource(
  resourceType: string,
  resourceId: string,
): Promise<AuditEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), "audit_logs"),
      where("resourceType", "==", resourceType),
      where("resourceId", "==", resourceId),
      orderBy("at", "desc"),
      limit(100),
    ),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditEntry);
}
