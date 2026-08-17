import { describe, expect, it } from "vitest";
import {
  availableTransitions,
  evaluateTransition,
  isLocked,
  isPubliclyVisible,
  type FinancialStatus,
  type TransitionContext,
} from "@/lib/domain/financial-state";
import type { Role } from "@/lib/domain/rbac";

const CREATOR = "uid-creator";
const REVIEWER = "uid-reviewer";

function ctx(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    kind: "donation",
    actorUid: REVIEWER,
    actorRole: "FINANCE_ADMIN",
    actorStatus: "ACTIVE",
    createdBy: CREATOR,
    ...overrides,
  };
}

describe("two-person approval", () => {
  it("lets a second finance admin verify a submitted donation", () => {
    expect(evaluateTransition("SUBMITTED", "VERIFIED", ctx()).ok).toBe(true);
  });

  it("refuses to let the creator verify their own donation", () => {
    const result = evaluateTransition("SUBMITTED", "VERIFIED", ctx({ actorUid: CREATOR }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SELF_APPROVAL");
  });

  it("refuses self-approval even for a super admin", () => {
    const result = evaluateTransition(
      "SUBMITTED",
      "VERIFIED",
      ctx({ actorUid: CREATOR, actorRole: "SUPER_ADMIN" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SELF_APPROVAL");
  });

  it("refuses to let the creator reject their own record to dodge review", () => {
    const result = evaluateTransition(
      "SUBMITTED",
      "DRAFT",
      ctx({ actorUid: CREATOR, reason: "changed my mind" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SELF_APPROVAL");
  });
});

describe("locked history", () => {
  it("marks verified and later states as locked", () => {
    expect(isLocked("DRAFT")).toBe(false);
    expect(isLocked("SUBMITTED")).toBe(false);
    expect(isLocked("VERIFIED")).toBe(true);
    expect(isLocked("PUBLISHED")).toBe(true);
    expect(isLocked("REVERSED")).toBe(true);
  });

  it("blocks correcting a published record without an immutable revision", () => {
    const result = evaluateTransition(
      "PUBLISHED",
      "PUBLISHED",
      ctx({ reason: "wrong amount entered" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("REVISION_REQUIRED");
  });

  it("blocks correcting a published record without a reason", () => {
    const result = evaluateTransition(
      "PUBLISHED",
      "PUBLISHED",
      ctx({ revisionWitnessed: true }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("REASON_REQUIRED");
  });

  it("permits a correction that is both reasoned and witnessed", () => {
    const result = evaluateTransition(
      "PUBLISHED",
      "PUBLISHED",
      ctx({ reason: "receipt showed 8,000 not 10,000", revisionWitnessed: true }),
    );
    expect(result.ok).toBe(true);
  });

  it("requires a witnessed revision to reverse a published donation", () => {
    expect(
      evaluateTransition("PUBLISHED", "REVERSED", ctx({ reason: "cheque bounced" })).ok,
    ).toBe(false);
    expect(
      evaluateTransition(
        "PUBLISHED",
        "REVERSED",
        ctx({ reason: "cheque bounced", revisionWitnessed: true }),
      ).ok,
    ).toBe(true);
  });
});

describe("illegal shortcuts", () => {
  const illegal: Array<[FinancialStatus, FinancialStatus]> = [
    ["DRAFT", "VERIFIED"],
    ["DRAFT", "PUBLISHED"],
    ["SUBMITTED", "PUBLISHED"],
    ["REJECTED", "PUBLISHED"],
    ["REVERSED", "PUBLISHED"],
    ["PUBLISHED", "DRAFT"],
    ["PUBLISHED", "SUBMITTED"],
  ];

  it.each(illegal)("refuses %s -> %s", (from, to) => {
    const result = evaluateTransition(from, to, ctx({ reason: "x", revisionWitnessed: true }));
    expect(result.ok).toBe(false);
  });

  it("never lets a draft skip straight to the public site", () => {
    expect(isPubliclyVisible("DRAFT")).toBe(false);
    expect(isPubliclyVisible("VERIFIED")).toBe(false);
    expect(isPubliclyVisible("PUBLISHED")).toBe(true);
  });
});

describe("role restrictions", () => {
  it("stops an auditor changing anything", () => {
    const attempts: Array<[FinancialStatus, FinancialStatus]> = [
      ["DRAFT", "SUBMITTED"],
      ["SUBMITTED", "VERIFIED"],
      ["VERIFIED", "PUBLISHED"],
      ["PUBLISHED", "REVERSED"],
    ];
    for (const [from, to] of attempts) {
      const result = evaluateTransition(
        from,
        to,
        ctx({ actorRole: "AUDITOR", reason: "r", revisionWitnessed: true }),
      );
      expect(result.ok, `auditor should not perform ${from} -> ${to}`).toBe(false);
    }
  });

  it("stops an event admin touching donations", () => {
    const result = evaluateTransition("SUBMITTED", "VERIFIED", ctx({ actorRole: "EVENT_ADMIN" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_PERMISSION");
  });

  it("allows only super admins to archive", () => {
    expect(evaluateTransition("PUBLISHED", "ARCHIVED", ctx()).ok).toBe(false);
    expect(
      evaluateTransition("PUBLISHED", "ARCHIVED", ctx({ actorRole: "SUPER_ADMIN" })).ok,
    ).toBe(true);
  });

  it("strips all power from a suspended administrator", () => {
    const roles: Role[] = ["SUPER_ADMIN", "FINANCE_ADMIN"];
    for (const role of roles) {
      const result = evaluateTransition(
        "SUBMITTED",
        "VERIFIED",
        ctx({ actorRole: role, actorStatus: "SUSPENDED" }),
      );
      expect(result.ok, `${role} should be powerless while suspended`).toBe(false);
      if (!result.ok) expect(result.code).toBe("INACTIVE_ACTOR");
    }
  });
});

describe("availableTransitions", () => {
  it("offers verification and rejection on a submitted record", () => {
    const options = availableTransitions("SUBMITTED", ctx());
    expect(options).toContain("VERIFIED");
    expect(options).toContain("REJECTED");
    expect(options).not.toContain("PUBLISHED");
  });

  it("offers nothing to the creator of a submitted record", () => {
    const options = availableTransitions("SUBMITTED", ctx({ actorUid: CREATOR }));
    expect(options).toEqual([]);
  });
});
