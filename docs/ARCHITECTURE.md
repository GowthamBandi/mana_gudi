# Architecture

## The decision that shaped everything else

`firebase functions:list` fails on this project: Cloud Functions requires the
Blaze plan, and no billing account is attached. Firebase App Hosting, which
backs Next.js SSR on Firebase, is unavailable for the same reason.

Two options existed: block the project on a billing decision, or design a system
that needs no trusted server tier. The second was chosen, on the grounds that a
village temple should not need a credit card to publish its accounts.

**Consequence:** there is no privileged backend. The browser talks to Firestore
directly, and **Firestore Security Rules are the authorization boundary**. This
is not a weakening — rules execute on Google's infrastructure and cannot be
bypassed by a modified client, which is exactly the property a server would have
provided. What is lost is the ability to run trusted *logic* (PDF generation,
outbound SMS, scheduled aggregation); those are documented as gaps rather than
faked.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.3.1 (App Router), React 19 | Static export gives real HTML per route for SEO; no server required |
| Language | TypeScript, strict | Build fails on type errors (`typescript.ignoreBuildErrors: false`) |
| Styling | Tailwind CSS v4 | Design tokens in `globals.css`; no runtime CSS-in-JS cost |
| Data | Firestore (client SDK) | Rules-enforced access; offline persistence for patchy rural connections |
| Auth | Firebase Auth, email/password | No public sign-up path exists anywhere |
| Hosting | Firebase Hosting (static export) | Works on the free tier; custom domain attachable later |
| Tests | Vitest, `@firebase/rules-unit-testing`, Playwright, axe-core | See `docs/EVIDENCE-LOG.md` |

Package manager is **npm** — pnpm, yarn and bun are not installed on this machine.

## Why static export

`output: "export"` in `next.config.ts`. Every route is a real HTML file, so the
public transparency pages are indexable and load instantly. Data is fetched in
the browser.

The trade-off is that dynamic path segments cannot be pre-rendered for data that
does not exist at build time. Detail views therefore use query parameters:

- `/verify?ref=DON-2026-00001` — receipt verification (also the QR-code target)
- `/events?id=evt-shivaratri` — event detail

## Data model

Data is classified before it is exposed, not after.

| Class | Collections | Who may read |
|---|---|---|
| **PUBLIC** | `public_donations`, `public_expenses`, `public_funds`, `public_stats`, `public_events`, `public_announcements`, `public_documents`, `public_gallery`, `public_reports`, `public_corrections`, `temple_profile`, `config` | anyone, no account |
| **INTERNAL** | `donations`, `expenses`, `funds`, `events`, `registrations`, `feedback`, `documents`, `volunteer_signups`, `hundi_sessions`, `counters` | specific roles only |
| **SENSITIVE** | `admin_users`, `feedback/{id}/internal` | super admin / assigned staff |
| **AUDIT** | `audit_logs`, `donations/{id}/revisions`, `expenses/{id}/revisions` | append-only; readable by super admin and auditor |

### Public projections, not public collections

Transparency is **not** implemented by making `donations` world-readable. The
internal record holds donor phone, email and address; the public read model is a
separate document built field by field.

The rules enforce this structurally with a `keys().hasOnly([...])` allowlist, so
a projection **physically cannot contain** `donorPhone` — the write is rejected.
Adding a new private field to the internal record can therefore never leak it.

```
donations/{id}          →  donorName, donorPhone, donorAddress, amountPaise, …
public_donations/{id}   →  displayName, amountPaise, purpose, fundName, …
                           (allowlisted; no contact fields possible)
```

## The financial state machine

```
DRAFT ──submit──> SUBMITTED ──verify──> VERIFIED ──publish──> PUBLISHED
  ^                   │  (must be a different person)              │
  └───── send back ───┘                                            │
                                                       ┌───────────┴──────────┐
                                                  correction              reversal
                                                  (witnessed)            (witnessed)
```

Encoded twice, deliberately:

- `src/lib/domain/financial-state.ts` — gives the treasurer a clear message
- `firebase/firestore.rules` — the guarantee that holds against a hostile client

They must be changed together. `tests/rules/` exists to catch them drifting.

## How silent history alteration is made impossible

This is the central mechanism, and it works without any server.

Firestore evaluates each write independently, so a client cannot "batch away" an
inconvenient document. That property is turned into the guarantee:

1. To change a `PUBLISHED` amount, the client must **first** create
   `donations/{id}/revisions/{n}` containing a snapshot of the record's
   **current** values. The rules verify the snapshot matches what is actually
   stored, that `n` is exactly `revisionCount + 1`, and that a reason is given.
2. Revisions are `create`-only. `allow update, delete: if false` — for every
   role, including SUPER_ADMIN.
3. Only then will the rules permit the parent document to change, and only if
   revision `n` exists and tells the truth.

To turn a published ₹10,000 into ₹1,000, an attacker must first publish an
immutable record saying it used to be ₹10,000. There is no ordering of writes
that avoids this.

A `public_corrections` entry is also written, so the change is visible to the
village, not only to auditors. That collection is `create`-only too.

**Verified by:** `tests/rules/financial-integrity.test.ts`, and by mutation
testing (`scripts/mutation-check.mjs`) which confirms the tests actually fail
when the guarantee is removed.

## Two-person approval

`verifiedBy != createdBy`, enforced in the rules — not in the UI.

It applies to super admins too: there is no role that can move a donation from
entry to public ledger alone. Hundi cash counting goes further, requiring at
least two counters and a verifier who was not one of them.

## Authorization

Role lives in `admin_users/{uid}`, which rules read with `get()`.

Custom claims were **not** used, because setting a claim requires the Admin SDK
and therefore a trusted server, which this deployment does not have. The Firestore
document approach has a genuine advantage: suspending an administrator takes
effect on the next request, whereas a custom claim persists until the user's ID
token expires (up to an hour).

Escalation is blocked by three separate rules:
- only SUPER_ADMIN may write `admin_users`
- **nobody may edit their own record** (`request.auth.uid != uid`), so a super
  admin cannot self-demote to dodge review, and no one can self-promote
- roles are validated against a fixed list, so `GOD_MODE` is rejected

## Cost control

Firestore charges per document read. Design choices that follow from that:

- Dashboard totals come from **pre-computed** `public_stats` documents, not from
  summing the donation collection on every page view
- Every listing is `limit()`-bounded and **cursor**-paginated (`startAfter`), not
  offset-paginated — an offset query re-reads every skipped document
- No unbounded `onSnapshot` listeners anywhere; all reads are one-shot `getDocs`
- IndexedDB persistent cache absorbs repeat reads during navigation
- 10 composite indexes are declared so filtered queries never table-scan

## Known architectural gaps

Honest list; none of these are pretended to work:

- **Cloud Functions** — unavailable without billing. Aggregates in `public_stats`
  are currently written by the seed script; in production they need either a
  scheduled function (Blaze) or a manual recompute action.
- **Storage** — rules are written and reviewed but **not deployed**; the bucket
  requires console setup. File upload UI is therefore not built.
- **FCM / SMS / WhatsApp** — no provider is configured, so no notification
  delivery is claimed. The notification *model* is deliberately absent rather
  than stubbed with fake success messages.
- **PDF receipts** — not implemented. The verification page is the receipt of
  record; a QR code pointing at `/verify?ref=…` is the intended print artefact.
- **App Check** — requires a reCAPTCHA site key registration step in the console.
