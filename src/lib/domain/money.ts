/**
 * Money handling for the temple ledger.
 *
 * Every amount is stored and computed as an integer number of paise. Rupee
 * floats are only ever produced at the moment of display. This is deliberate:
 * 0.1 + 0.2 !== 0.3 in IEEE-754, and a temple ledger that drifts by a paisa per
 * transaction loses public trust faster than one that is merely ugly.
 */

export const CURRENCY = "INR" as const;

export class MoneyError extends Error {}

/** Largest amount we accept: ₹1,00,00,00,000 (100 crore) expressed in paise. */
export const MAX_PAISE = 100_000_000_000;

/**
 * Parses human rupee input ("1000", "1,000.50", "₹ 1000") into integer paise.
 * Rejects anything that would silently lose precision.
 */
export function rupeesToPaise(input: string | number): number {
  const raw = typeof input === "number" ? String(input) : input;
  const cleaned = raw.replace(/[₹,\s]/g, "").trim();

  if (cleaned === "") throw new MoneyError("Amount is required");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(
      "Enter a valid amount in rupees, using at most two decimal places",
    );
  }

  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = cleaned.replace("-", "").split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(paise)) throw new MoneyError("Amount is too large");
  return negative ? -paise : paise;
}

export function paiseToRupees(paise: number): number {
  assertInteger(paise);
  return paise / 100;
}

function assertInteger(paise: number): void {
  if (!Number.isInteger(paise)) {
    throw new MoneyError(`Amount must be an integer number of paise, got ${paise}`);
  }
}

/**
 * Validates an amount destined for a financial record.
 * Zero and negative values are rejected — a reversal is modelled as a state
 * transition with an audit trail, never as a negative donation.
 */
export function assertValidLedgerAmount(paise: number): void {
  assertInteger(paise);
  if (paise <= 0) throw new MoneyError("Amount must be greater than zero");
  if (paise > MAX_PAISE) throw new MoneyError("Amount exceeds the permitted maximum");
}

export function isValidLedgerAmount(paise: unknown): paise is number {
  return (
    typeof paise === "number" &&
    Number.isInteger(paise) &&
    paise > 0 &&
    paise <= MAX_PAISE
  );
}

/** Groups digits the Indian way: 12,34,567 rather than 1,234,567. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export interface FormatOptions {
  /** Drop ".00" on whole-rupee amounts. Defaults to true. */
  trimWholeRupeePaise?: boolean;
  /** Include the ₹ symbol. Defaults to true. */
  symbol?: boolean;
}

export function formatPaise(paise: number, options: FormatOptions = {}): string {
  const { trimWholeRupeePaise = true, symbol = true } = options;
  assertInteger(paise);

  const negative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const remainder = abs % 100;

  let text = groupIndian(String(whole));
  if (!(trimWholeRupeePaise && remainder === 0)) {
    text += "." + String(remainder).padStart(2, "0");
  }

  return `${negative ? "-" : ""}${symbol ? "₹" : ""}${text}`;
}

/**
 * Compact form for dashboard tiles, using units villagers actually read:
 * thousands, lakh, crore.
 */
export function formatPaiseCompact(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";

  if (rupees >= 1_00_00_000) return `${sign}₹${trim(rupees / 1_00_00_000)} Cr`;
  if (rupees >= 1_00_000) return `${sign}₹${trim(rupees / 1_00_000)} L`;
  if (rupees >= 1_000) return `${sign}₹${trim(rupees / 1_000)}K`;
  return formatPaise(paise);
}

function trim(value: number): string {
  return value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

/** Sums paise safely, refusing to produce a value outside the safe range. */
export function sumPaise(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    assertInteger(value);
    total += value;
    if (!Number.isSafeInteger(total)) throw new MoneyError("Sum overflowed safe range");
  }
  return total;
}
