/**
 * Human-facing identifiers.
 *
 * Receipt and voucher numbers are printed on paper, read aloud over a phone,
 * and typed into the public verification page by people who are not fluent
 * with computers. They are therefore uppercase, hyphenated, and free of
 * characters that are easy to confuse (no O/0, I/1 ambiguity in random parts).
 */

export const RECEIPT_PREFIX = "DON";
export const VOUCHER_PREFIX = "EXP";
export const FEEDBACK_PREFIX = "FB";
export const HUNDI_PREFIX = "HND";

/** Unambiguous alphabet: no O, 0, I, 1, L. */
const SAFE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function formatSequence(prefix: string, year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Sequence must be a positive integer");
  }
  return `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;
}

export function receiptNumber(year: number, sequence: number): string {
  return formatSequence(RECEIPT_PREFIX, year, sequence);
}

export function voucherNumber(year: number, sequence: number): string {
  return formatSequence(VOUCHER_PREFIX, year, sequence);
}

export function hundiSessionNumber(year: number, sequence: number): string {
  return formatSequence(HUNDI_PREFIX, year, sequence);
}

const SEQUENCE_PATTERN = /^([A-Z]{2,4})-(\d{4})-(\d{5})$/;

export interface ParsedReference {
  prefix: string;
  year: number;
  sequence: number;
}

/**
 * Parses a reference typed by a member of the public. Tolerates lowercase and
 * surrounding whitespace, because that is what people actually type.
 */
export function parseReference(input: string): ParsedReference | null {
  const normalised = input.trim().toUpperCase().replace(/\s+/g, "");
  const match = SEQUENCE_PATTERN.exec(normalised);
  if (!match) return null;
  return { prefix: match[1], year: Number(match[2]), sequence: Number(match[3]) };
}

export function normaliseReference(input: string): string | null {
  const parsed = parseReference(input);
  return parsed ? formatSequence(parsed.prefix, parsed.year, parsed.sequence) : null;
}

export function isReceiptNumber(input: string): boolean {
  return parseReference(input)?.prefix === RECEIPT_PREFIX;
}

/**
 * Random tracking code for complaints and suggestions.
 * Long enough that it cannot be guessed, since knowing the code is what grants
 * read access to that one document.
 */
export function trackingCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < 10) throw new Error("Need at least 10 bytes of entropy");
  let code = "";
  for (let i = 0; i < 10; i += 1) {
    code += SAFE_ALPHABET[randomBytes[i] % SAFE_ALPHABET.length];
  }
  return `${FEEDBACK_PREFIX}-${code.slice(0, 5)}-${code.slice(5)}`;
}

export function generateTrackingCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return trackingCode(bytes);
}

/**
 * Normalises an Indian mobile number to bare 10 digits so that "+91 98765
 * 43210", "098765 43210" and "9876543210" are recognised as one person.
 */
export function normalisePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits.startsWith("0") && digits.length === 11
      ? digits.slice(1)
      : digits;

  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/** Stable, non-cryptographic hash (FNV-1a) used only for duplicate detection. */
export function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

/**
 * Deterministic registration document ID.
 *
 * Because the ID is derived from the event and the phone number, a second
 * attempt to register the same person for the same event collides with the
 * existing document and is refused by Firestore's create semantics. Duplicate
 * suppression therefore survives a double-tapped submit button, a page
 * refresh, and a replayed request.
 */
export function registrationId(eventId: string, phone: string): string | null {
  const normalised = normalisePhone(phone);
  if (!normalised) return null;
  return `${eventId}__${stableHash(normalised)}`;
}
