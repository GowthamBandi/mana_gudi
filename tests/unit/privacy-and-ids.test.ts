import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_LABEL,
  assertNoPrivateFields,
  maskName,
  publicDisplayName,
} from "@/lib/domain/donor-privacy";
import {
  formatSequence,
  generateTrackingCode,
  isReceiptNumber,
  normalisePhone,
  normaliseReference,
  parseReference,
  receiptNumber,
  registrationId,
  stableHash,
  trackingCode,
  voucherNumber,
} from "@/lib/domain/ids";

describe("donor display names", () => {
  it("shows the full name only when the donor asked for it", () => {
    expect(publicDisplayName("Ramesh Kumar", "FULL")).toBe("Ramesh Kumar");
  });

  it("masks to initials", () => {
    expect(publicDisplayName("Ramesh Kumar", "MASKED")).toBe("R***** K****");
    expect(maskName("A")).toBe("A");
  });

  it("never leaks a name for an anonymous donor", () => {
    expect(publicDisplayName("Ramesh Kumar", "ANONYMOUS")).toBe(ANONYMOUS_LABEL);
  });

  it("falls back to anonymous rather than publishing a blank identity", () => {
    expect(publicDisplayName("", "FULL")).toBe(ANONYMOUS_LABEL);
    expect(publicDisplayName("   ", "MASKED")).toBe(ANONYMOUS_LABEL);
    expect(publicDisplayName(null, "FULL")).toBe(ANONYMOUS_LABEL);
    expect(publicDisplayName(undefined, "MASKED")).toBe(ANONYMOUS_LABEL);
  });

  it("handles non-Latin scripts without mangling them", () => {
    expect(publicDisplayName("రమేష్", "FULL")).toBe("రమేష్");
    // Masking counts codepoints, not UTF-16 units.
    expect(maskName("రమ")).toBe("ర*");
  });
});

describe("private field guard", () => {
  it("refuses a payload carrying donor contact details", () => {
    expect(() =>
      assertNoPrivateFields({ displayName: "R", donorPhone: "9876543210" }),
    ).toThrow(/donorPhone/);
  });

  it("names every leaked field so the bug is obvious", () => {
    expect(() =>
      assertNoPrivateFields({ donorEmail: "a@b.c", donorAddress: "x", notes: "n" }),
    ).toThrow(/donorEmail, donorAddress, notes/);
  });

  it("passes a clean public payload", () => {
    expect(() => assertNoPrivateFields({ displayName: "R*****", amountPaise: 100 })).not.toThrow();
  });
});

describe("reference numbers", () => {
  it("formats receipts and vouchers predictably", () => {
    expect(receiptNumber(2026, 1)).toBe("DON-2026-00001");
    expect(voucherNumber(2026, 42)).toBe("EXP-2026-00042");
  });

  it("rejects a non-positive sequence", () => {
    expect(() => formatSequence("DON", 2026, 0)).toThrow();
    expect(() => formatSequence("DON", 2026, -1)).toThrow();
  });

  it("parses what a villager actually types", () => {
    expect(parseReference("  don-2026-00001 ")).toEqual({
      prefix: "DON",
      year: 2026,
      sequence: 1,
    });
    expect(normaliseReference("don 2026 00001".replace(/ /g, "-"))).toBe("DON-2026-00001");
  });

  it("returns null for malformed references instead of guessing", () => {
    for (const bad of ["DON-26-1", "DON/2026/00001", "", "DONATION", "../../etc/passwd"]) {
      expect(parseReference(bad), bad).toBeNull();
    }
  });

  it("distinguishes receipts from vouchers", () => {
    expect(isReceiptNumber("DON-2026-00001")).toBe(true);
    expect(isReceiptNumber("EXP-2026-00001")).toBe(false);
  });
});

describe("tracking codes", () => {
  it("avoids characters people confuse when reading aloud", () => {
    const code = trackingCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(code).toMatch(/^FB-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    expect(code).not.toMatch(/[O0I1L]/);
  });

  it("demands real entropy", () => {
    expect(() => trackingCode(new Uint8Array(4))).toThrow(/entropy/);
  });

  it("produces distinct codes", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateTrackingCode()));
    expect(codes.size).toBe(200);
  });
});

describe("phone normalisation", () => {
  it("treats the same mobile written different ways as one person", () => {
    const variants = ["9876543210", "+91 98765 43210", "09876543210", "+91-9876543210"];
    const normalised = variants.map(normalisePhone);
    expect(new Set(normalised).size).toBe(1);
    expect(normalised[0]).toBe("9876543210");
  });

  it("rejects numbers that are not Indian mobiles", () => {
    for (const bad of ["1234567890", "98765", "abcdefghij", "5876543210", ""]) {
      expect(normalisePhone(bad), bad).toBeNull();
    }
  });
});

describe("registration identity", () => {
  it("derives the same document ID for a repeated registration", () => {
    const first = registrationId("evt-001", "9876543210");
    const second = registrationId("evt-001", "+91 98765 43210");
    expect(first).toBe(second);
    expect(first).not.toBeNull();
  });

  it("keeps different events and different people apart", () => {
    expect(registrationId("evt-001", "9876543210")).not.toBe(
      registrationId("evt-002", "9876543210"),
    );
    expect(registrationId("evt-001", "9876543210")).not.toBe(
      registrationId("evt-001", "9876543211"),
    );
  });

  it("refuses to build an ID from an invalid phone", () => {
    expect(registrationId("evt-001", "123")).toBeNull();
  });

  it("produces IDs safe to use as Firestore document paths", () => {
    const id = registrationId("evt-001", "9876543210");
    expect(id).toMatch(/^[A-Za-z0-9_-]+__[a-z0-9]+$/);
    expect(id).not.toContain("/");
  });

  it("hashes deterministically", () => {
    expect(stableHash("9876543210")).toBe(stableHash("9876543210"));
    expect(stableHash("a")).not.toBe(stableHash("b"));
  });
});
