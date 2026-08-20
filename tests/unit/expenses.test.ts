import { describe, expect, it } from "vitest";
import { evaluateTransition, isLocked, isPubliclyVisible } from "@/lib/domain/financial-state";
import { toPublicProjection } from "@/lib/services/expenses";
import type { Expense } from "@/lib/services/types";

const CREATOR = "uid-creator";

describe("expense single-authority state machine", () => {
  it("allows a finance admin to directly publish an expense", () => {
    const res = evaluateTransition("DRAFT", "PUBLISHED", {
      kind: "expense",
      actorUid: CREATOR,
      actorRole: "FINANCE_ADMIN",
      actorStatus: "ACTIVE",
      createdBy: CREATOR,
    });
    expect(res.ok).toBe(true);
  });

  it("correctly identifies locked and public states for expenses", () => {
    expect(isLocked("VERIFIED")).toBe(true);
    expect(isLocked("PUBLISHED")).toBe(true);
    expect(isLocked("DRAFT")).toBe(false);

    expect(isPubliclyVisible("PUBLISHED")).toBe(true);
  });
});

describe("expense public projection", () => {
  it("projects public expense fields correctly without private keys", () => {
    const sampleExpense: Expense = {
      id: "exp-123",
      voucherNo: "EXP-2026-00001",
      category: "Annadanam",
      description: "Provisions for festival",
      amountPaise: 1850000,
      currency: "INR",
      fundId: "fund-annadanam",
      payeeDisplay: "Village Store",
      occurredAt: new Date("2026-02-01"),
      status: "PUBLISHED",
      createdBy: CREATOR,
      createdAt: new Date("2026-02-01"),
      verifiedBy: null,
      publishedBy: CREATOR,
      rejectionReason: null,
      lastCorrectionReason: null,
      revisionCount: 0,
    };

    const projection = toPublicProjection(sampleExpense, "Annadanam Fund");
    expect(projection.voucherNo).toBe("EXP-2026-00001");
    expect(projection.amountPaise).toBe(1850000);
    expect(projection.fundName).toBe("Annadanam Fund");
    expect(projection.status).toBe("PUBLISHED");
    expect(projection).not.toHaveProperty("createdBy");
    expect(projection).not.toHaveProperty("verifiedBy");
  });
});
