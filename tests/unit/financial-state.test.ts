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

function ctx(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    kind: "donation",
    actorUid: CREATOR,
    actorRole: "FINANCE_ADMIN",
    actorStatus: "ACTIVE",
    createdBy: CREATOR,
    ...overrides,
  };
}

describe("single-authority immediate publication workflow", () => {
  it("allows an authorized finance admin to publish a donation directly upon creation", () => {
    expect(evaluateTransition("DRAFT", "PUBLISHED", ctx()).ok).toBe(true);
  });

  it("allows an authorized finance admin to publish a submitted donation", () => {
    expect(evaluateTransition("SUBMITTED", "PUBLISHED", ctx()).ok).toBe(true);
  });

  it("allows super admin to publish directly", () => {
    expect(evaluateTransition("DRAFT", "PUBLISHED", ctx({ actorRole: "SUPER_ADMIN" })).ok).toBe(true);
  });
});

describe("locked history & witnessed corrections", () => {
  it("marks verified, published, reversed, and archived as locked", () => {
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

describe("illegal shortcuts & public visibility", () => {
  const illegal: Array<[FinancialStatus, FinancialStatus]> = [
    ["REVERSED", "PUBLISHED"],
    ["PUBLISHED", "DRAFT"],
    ["PUBLISHED", "SUBMITTED"],
  ];

  it.each(illegal)("refuses %s -> %s", (from, to) => {
    const result = evaluateTransition(from, to, ctx({ reason: "x", revisionWitnessed: true }));
    expect(result.ok).toBe(false);
  });

  it("ensures only PUBLISHED records are publicly visible", () => {
    expect(isPubliclyVisible("DRAFT")).toBe(false);
    expect(isPubliclyVisible("SUBMITTED")).toBe(false);
    expect(isPubliclyVisible("PUBLISHED")).toBe(true);
  });
});

describe("role restrictions", () => {
  it("stops an auditor changing anything", () => {
    const attempts: Array<[FinancialStatus, FinancialStatus]> = [
      ["DRAFT", "PUBLISHED"],
      ["SUBMITTED", "PUBLISHED"],
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

  it("stops an event admin touching financial records", () => {
    const result = evaluateTransition("DRAFT", "PUBLISHED", ctx({ actorRole: "EVENT_ADMIN" }));
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
        "DRAFT",
        "PUBLISHED",
        ctx({ actorRole: role, actorStatus: "SUSPENDED" }),
      );
      expect(result.ok, `${role} should be powerless while suspended`).toBe(false);
      if (!result.ok) expect(result.code).toBe("INACTIVE_ACTOR");
    }
  });
});

describe("availableTransitions", () => {
  it("offers direct publication on a draft record for finance admins", () => {
    const options = availableTransitions("DRAFT", ctx());
    expect(options).toContain("PUBLISHED");
  });
});
