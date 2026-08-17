import { describe, expect, it } from "vitest";
import {
  MoneyError,
  assertValidLedgerAmount,
  formatPaise,
  formatPaiseCompact,
  groupIndian,
  isValidLedgerAmount,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from "@/lib/domain/money";

describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(rupeesToPaise("1000")).toBe(100000);
    expect(rupeesToPaise(500)).toBe(50000);
  });

  it("converts paise without floating point drift", () => {
    expect(rupeesToPaise("0.10")).toBe(10);
    expect(rupeesToPaise("0.20")).toBe(20);
    // The classic 0.1 + 0.2 problem must not appear in a temple ledger.
    expect(rupeesToPaise("0.10") + rupeesToPaise("0.20")).toBe(rupeesToPaise("0.30"));
  });

  it("accepts rupee symbols and thousands separators as typed by humans", () => {
    expect(rupeesToPaise("₹ 1,00,000")).toBe(10000000);
    expect(rupeesToPaise("1,000.50")).toBe(100050);
  });

  it("rejects amounts with more precision than paise", () => {
    expect(() => rupeesToPaise("10.001")).toThrow(MoneyError);
  });

  it("rejects junk input", () => {
    for (const bad of ["", "abc", "10.10.10", "1e5", "--5", "10-"]) {
      expect(() => rupeesToPaise(bad), `expected ${bad} to be rejected`).toThrow(MoneyError);
    }
  });
});

describe("ledger amount validation", () => {
  it("rejects zero and negative amounts", () => {
    expect(() => assertValidLedgerAmount(0)).toThrow(/greater than zero/);
    expect(() => assertValidLedgerAmount(-100)).toThrow(/greater than zero/);
  });

  it("rejects non-integer paise", () => {
    expect(() => assertValidLedgerAmount(10.5)).toThrow(/integer/);
  });

  it("rejects absurdly large amounts", () => {
    expect(() => assertValidLedgerAmount(100_000_000_001)).toThrow(/maximum/);
  });

  it("narrows unknown values safely", () => {
    expect(isValidLedgerAmount(100)).toBe(true);
    expect(isValidLedgerAmount("100")).toBe(false);
    expect(isValidLedgerAmount(NaN)).toBe(false);
    expect(isValidLedgerAmount(Infinity)).toBe(false);
    expect(isValidLedgerAmount(null)).toBe(false);
  });
});

describe("Indian digit grouping", () => {
  it("groups the Indian way, not the Western way", () => {
    expect(groupIndian("1234567")).toBe("12,34,567");
    expect(groupIndian("100000")).toBe("1,00,000");
    expect(groupIndian("999")).toBe("999");
    expect(groupIndian("1000")).toBe("1,000");
  });
});

describe("formatting", () => {
  it("formats whole rupees without trailing paise", () => {
    expect(formatPaise(10000000)).toBe("₹1,00,000");
  });

  it("keeps paise when they are significant", () => {
    expect(formatPaise(100050)).toBe("₹1,000.50");
  });

  it("formats negative amounts", () => {
    expect(formatPaise(-100050)).toBe("-₹1,000.50");
  });

  it("uses lakh and crore for dashboard tiles", () => {
    expect(formatPaiseCompact(rupeesToPaise("250000"))).toBe("₹2.5 L");
    expect(formatPaiseCompact(rupeesToPaise("15000000"))).toBe("₹1.5 Cr");
    expect(formatPaiseCompact(rupeesToPaise("5000"))).toBe("₹5K");
    expect(formatPaiseCompact(rupeesToPaise("500"))).toBe("₹500");
  });
});

describe("sumPaise", () => {
  it("sums integer paise exactly", () => {
    expect(sumPaise([10, 20, 30])).toBe(60);
    expect(sumPaise([])).toBe(0);
  });

  it("refuses to sum non-integers", () => {
    expect(() => sumPaise([10, 0.5])).toThrow(MoneyError);
  });
});

describe("paiseToRupees", () => {
  it("converts for display only", () => {
    expect(paiseToRupees(100050)).toBe(1000.5);
  });

  it("rejects non-integer input", () => {
    expect(() => paiseToRupees(1.5)).toThrow(MoneyError);
  });
});
