/**
 * Donor privacy.
 *
 * Public transparency is about where the money went, not about exposing the
 * people who gave it. A donor chooses how they appear on the public ledger, and
 * this module is the only place that decision is turned into a display string.
 *
 * Everything else about a donor — phone, email, address, payment reference —
 * is structurally excluded from the public read model by the field allowlists
 * in firebase/firestore.rules.
 */

export const DISPLAY_PREFERENCES = ["FULL", "MASKED", "ANONYMOUS"] as const;
export type DisplayPreference = (typeof DISPLAY_PREFERENCES)[number];

export const ANONYMOUS_LABEL = "Anonymous Devotee";

export const DISPLAY_PREFERENCE_LABELS: Record<DisplayPreference, string> = {
  FULL: "Show my full name",
  MASKED: "Show my initials only",
  ANONYMOUS: "Do not show my name",
};

/**
 * Masks a name to initials while keeping it recognisable to the donor
 * themselves: "Ramesh Kumar" becomes "R***** K****".
 *
 * The asterisk count follows the real length, which is a deliberate trade-off:
 * it reassures the donor that their entry is really theirs, and a name length
 * is not meaningful re-identification in a village ledger where the full name
 * was never published.
 */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ANONYMOUS_LABEL;

  return parts
    .map((part) => {
      const chars = Array.from(part);
      if (chars.length === 1) return chars[0];
      return chars[0] + "*".repeat(chars.length - 1);
    })
    .join(" ");
}

/**
 * Resolves the single string that may appear on the public ledger.
 * Falls back to anonymous whenever the name is missing or unusable, so a data
 * problem can never accidentally publish a blank or partial identity.
 */
export function publicDisplayName(
  name: string | null | undefined,
  preference: DisplayPreference,
): string {
  if (preference === "ANONYMOUS") return ANONYMOUS_LABEL;

  const trimmed = (name ?? "").trim();
  if (!trimmed) return ANONYMOUS_LABEL;

  return preference === "MASKED" ? maskName(trimmed) : trimmed;
}

/** Fields that must never cross into a public projection. */
export const PRIVATE_DONOR_FIELDS = [
  "donorPhone",
  "donorEmail",
  "donorAddress",
  "donorPan",
  "referenceNo",
  "bankAccount",
  "notes",
  "supportingDocPath",
] as const;

/**
 * Defence in depth: strips any private field from an object before it is
 * written to a public collection. The security rules reject these fields
 * anyway, but failing here produces a clear error at the call site instead of
 * an opaque PERMISSION_DENIED.
 */
export function assertNoPrivateFields(payload: Record<string, unknown>): void {
  const leaked = PRIVATE_DONOR_FIELDS.filter((field) => field in payload);
  if (leaked.length > 0) {
    throw new Error(
      `Refusing to publish: payload contains private donor fields: ${leaked.join(", ")}`,
    );
  }
}
