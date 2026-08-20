/**
 * The financial record lifecycle.
 *
 * Donations, expenses and hundi counts are not ordinary editable documents.
 * They move through a controlled state machine, and once they reach a locked
 * state their historical values may only change through a witnessed correction
 * that leaves an immutable revision behind.
 *
 * This module and firebase/firestore.rules encode the same machine. This copy
 * gives the UI good error messages; the rules copy is what actually stops a
 * hostile client. Both must be changed together — the security-rule tests in
 * tests/rules exist to catch them drifting apart.
 */

import type { Permission, Role } from "./rbac";
import { can } from "./rbac";

export const FINANCIAL_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "PUBLISHED",
  "REJECTED",
  "REVERSED",
  "ARCHIVED",
] as const;

export type FinancialStatus = (typeof FINANCIAL_STATUSES)[number];

export const STATUS_LABELS: Record<FinancialStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Awaiting verification",
  VERIFIED: "Verified",
  PUBLISHED: "Published publicly",
  REJECTED: "Sent back",
  REVERSED: "Reversed",
  ARCHIVED: "Archived",
};

/**
 * States in which the recorded figures are considered historical truth.
 * Editing any of these requires the witnessed-correction path.
 */
export const LOCKED_STATUSES: readonly FinancialStatus[] = [
  "VERIFIED",
  "PUBLISHED",
  "REVERSED",
  "ARCHIVED",
];

export function isLocked(status: FinancialStatus): boolean {
  return LOCKED_STATUSES.includes(status);
}

/** Only PUBLISHED records may appear in a public projection. */
export function isPubliclyVisible(status: FinancialStatus): boolean {
  return status === "PUBLISHED";
}

export type RecordKind = "donation" | "expense";

export interface TransitionContext {
  kind: RecordKind;
  actorUid: string;
  actorRole: Role;
  actorStatus: "ACTIVE" | "SUSPENDED";
  /** The uid that originally created the record. */
  createdBy: string;
  /** Required when rejecting, correcting or reversing. */
  reason?: string;
  /** True when the caller has already written the immutable revision document. */
  revisionWitnessed?: boolean;
}

export type TransitionResult =
  | { ok: true }
  | { ok: false; code: TransitionErrorCode; reason: string };

export type TransitionErrorCode =
  | "UNKNOWN_STATUS"
  | "ILLEGAL_TRANSITION"
  | "MISSING_PERMISSION"
  | "SELF_APPROVAL"
  | "REASON_REQUIRED"
  | "REVISION_REQUIRED"
  | "INACTIVE_ACTOR";

function deny(code: TransitionErrorCode, reason: string): TransitionResult {
  return { ok: false, code, reason };
}

function permission(kind: RecordKind, action: string): Permission {
  return `${kind}:${action}` as Permission;
}

function identity(ctx: TransitionContext) {
  return { role: ctx.actorRole, status: ctx.actorStatus };
}

/**
 * Decides whether `from -> to` is permitted for this actor.
 *
 * The two controls that matter most:
 *  - SELF_APPROVAL: the person who created a record can never be the person who
 *    verifies it, so a single compromised account cannot move money end to end.
 *  - REVISION_REQUIRED: a locked record cannot change without an immutable
 *    snapshot of what it used to say.
 */
export function evaluateTransition(
  from: FinancialStatus,
  to: FinancialStatus,
  ctx: TransitionContext,
): TransitionResult {
  if (!FINANCIAL_STATUSES.includes(from) || !FINANCIAL_STATUSES.includes(to)) {
    return deny("UNKNOWN_STATUS", "Unrecognised record status");
  }

  if (ctx.actorStatus !== "ACTIVE") {
    return deny("INACTIVE_ACTOR", "This administrator account is not active");
  }

  const { kind } = ctx;

  // ---- archiving is a super-admin-only escape hatch, always available -------
  if (to === "ARCHIVED") {
    return ctx.actorRole === "SUPER_ADMIN"
      ? { ok: true }
      : deny("MISSING_PERMISSION", "Only a super administrator may archive records");
  }

  // ---- direct publish upon creation (single authority model) ----------------
  if ((from === "DRAFT" || from === "SUBMITTED" || from === "VERIFIED") && to === "PUBLISHED") {
    return can(identity(ctx), permission(kind, "create")) || can(identity(ctx), permission(kind, "publish"))
      ? { ok: true }
      : deny("MISSING_PERMISSION", "You may not publish financial records");
  }

  // ---- legacy draft & submission paths (preserved for historical transitions) ----
  if (from === "DRAFT" && to === "DRAFT") {
    return can(identity(ctx), permission(kind, "create"))
      ? { ok: true }
      : deny("MISSING_PERMISSION", "You may not edit financial records");
  }

  if (from === "DRAFT" && to === "SUBMITTED") {
    return can(identity(ctx), permission(kind, "submit"))
      ? { ok: true }
      : deny("MISSING_PERMISSION", "You may not submit records");
  }

  if (from === "SUBMITTED" && to === "VERIFIED") {
    if (!can(identity(ctx), permission(kind, "verify")) && !can(identity(ctx), permission(kind, "publish"))) {
      return deny("MISSING_PERMISSION", "You may not verify financial records");
    }
    return { ok: true };
  }

  // ---- rejection / send back ------------------------------------------------
  if (from === "SUBMITTED" && (to === "REJECTED" || to === "DRAFT")) {
    if (!can(identity(ctx), permission(kind, "verify"))) {
      return deny("MISSING_PERMISSION", "You may not review financial records");
    }
    if (ctx.actorUid === ctx.createdBy) {
      return deny("SELF_APPROVAL", "You cannot review a record you created yourself");
    }
    if (!ctx.reason?.trim()) {
      return deny("REASON_REQUIRED", "Give a reason so the creator can correct it");
    }
    return { ok: true };
  }

  // ---- publication -----------------------------------------------------------
  if (from === "VERIFIED" && to === "PUBLISHED") {
    return can(identity(ctx), permission(kind, "publish"))
      ? { ok: true }
      : deny("MISSING_PERMISSION", "You may not publish records to the public site");
  }

  // ---- correction of locked history -----------------------------------------
  if (isLocked(from) && to === from) {
    if (!can(identity(ctx), permission(kind, "correct"))) {
      return deny("MISSING_PERMISSION", "You may not correct published records");
    }
    if (!ctx.reason?.trim()) {
      return deny("REASON_REQUIRED", "A correction must state why the figure changed");
    }
    if (!ctx.revisionWitnessed) {
      return deny(
        "REVISION_REQUIRED",
        "The previous values must be recorded permanently before they can be changed",
      );
    }
    return { ok: true };
  }

  // ---- reversal --------------------------------------------------------------
  if (from === "PUBLISHED" && to === "REVERSED") {
    if (!can(identity(ctx), permission(kind, "correct"))) {
      return deny("MISSING_PERMISSION", "You may not reverse published records");
    }
    if (!ctx.reason?.trim()) {
      return deny("REASON_REQUIRED", "A reversal must state why the entry was withdrawn");
    }
    if (!ctx.revisionWitnessed) {
      return deny("REVISION_REQUIRED", "The original values must be recorded first");
    }
    return { ok: true };
  }

  // ---- resubmission after rejection -------------------------------------------
  if (from === "REJECTED" && to === "DRAFT") {
    return can(identity(ctx), permission(kind, "create"))
      ? { ok: true }
      : deny("MISSING_PERMISSION", "You may not reopen this record");
  }

  return deny(
    "ILLEGAL_TRANSITION",
    `A ${STATUS_LABELS[from].toLowerCase()} record cannot become ${STATUS_LABELS[to].toLowerCase()}`,
  );
}

/** Convenience wrapper for UI affordances. */
export function canTransition(
  from: FinancialStatus,
  to: FinancialStatus,
  ctx: TransitionContext,
): boolean {
  return evaluateTransition(from, to, ctx).ok;
}

/** The next states an actor could legitimately move a record into right now. */
export function availableTransitions(
  from: FinancialStatus,
  ctx: TransitionContext,
): FinancialStatus[] {
  return FINANCIAL_STATUSES.filter(
    (to) => to !== from && evaluateTransition(from, to, { ...ctx, reason: "probe", revisionWitnessed: true }).ok,
  );
}
