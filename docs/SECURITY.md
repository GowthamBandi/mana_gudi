# Security Model

The threat model assumes the browser is hostile. Every control below is enforced
by Firestore Security Rules — which run on Google's infrastructure — and not by
the user interface. The UI hides buttons for convenience; the database refuses
the operation.

## RBAC matrix

| Permission | SUPER_ADMIN | FINANCE_ADMIN | EVENT_ADMIN | CONTENT_ADMIN | AUDITOR | VOLUNTEER |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| donation:read | ✅ | ✅ | — | — | ✅ | — |
| donation:create / submit | ✅ | ✅ | — | — | — | — |
| donation:verify | ✅ | ✅ | — | — | — | — |
| donation:publish | ✅ | ✅ | — | — | — | — |
| donation:correct | ✅ | ✅ | — | — | — | — |
| expense:* | ✅ | ✅ | — | — | read only | — |
| fund:manage | ✅ | ✅ | — | — | — | — |
| hundi:count / verify | ✅ | ✅ | — | — | — | — |
| event:manage / publish | ✅ | — | ✅ | — | — | — |
| registration:read | ✅ | — | ✅ | — | ✅ | ✅ |
| registration:manage | ✅ | — | ✅ | — | — | — |
| content / document / announcement | ✅ | — | — | ✅ | — | — |
| report:generate | ✅ | ✅ | — | — | ✅ | — |
| audit:read | ✅ | — | — | — | ✅ | — |
| admin:manage | ✅ | — | — | — | — | — |
| config:manage | ✅ | — | — | — | — | — |

A **SUSPENDED** administrator holds none of these, whatever their role. This is
checked on every request (`status == 'ACTIVE'`), so revocation is immediate
rather than waiting for a token to expire.

Note: FINANCE_ADMIN deliberately **cannot** read `audit_logs`. The people who
move money are not the people who review the record of it being moved.

## Controls, and where each is enforced

| Control | Enforcement | Test |
|---|---|---|
| Public cannot read internal ledger | `donations` read = `canReadInternal()` | `access-control.test.ts` + live REST probe |
| Donor PII cannot reach public view | `keys().hasOnly()` allowlist | `financial-integrity.test.ts` |
| Anonymous donor stays anonymous | rules compare `displayPreference` to `displayName` | `financial-integrity.test.ts` |
| Creator cannot verify own record | `request.auth.uid != existing().createdBy` | rules + E2E |
| Published amount cannot silently change | witnessed-revision gate | rules + mutation test |
| Revision ledger cannot be rewritten | `allow update, delete: if false` | rules + mutation test |
| Audit log cannot be forged or edited | `actorUid == request.auth.uid`, `at == request.time`, no update/delete | rules |
| No self-promotion | `request.auth.uid != uid` on `admin_users` | rules |
| Financial records cannot be deleted | `allow delete: if false` | rules |
| Receipt numbers cannot be reused | counter must advance by exactly 1 | rules |
| Duplicate registration suppressed | document ID derived from event + phone | rules + E2E |
| Unknown collections denied | `match /{document=**} { allow read, write: if false; }` | rules |
| Admin portal not indexed | `X-Robots-Tag`, `robots.txt`, route metadata | live header check |

## What the public may read without an account

`public_*` collections, `temple_profile`, and `config`. `config` holds approval
thresholds only — it is public because those are public-interest facts. **Do not
put secrets in `config`**; it is world-readable by design.

Complaints are readable *by ID only* (`allow get: if true; allow list: if isActiveAdmin()`).
The ID is a 10-character code from `crypto.getRandomValues()` over an
unambiguous alphabet, so it acts as a capability: the complainant can check their
own submission, but nobody can browse other people's. Staff notes live in a
subcollection that the capability does not reach.

## Verified against production

Direct REST calls to `firestore.googleapis.com`, bypassing the app entirely:

```
donations        GET  403      public_donations  GET  200
expenses         GET  403      public_expenses   GET  200
audit_logs       GET  403      public_funds      GET  200
admin_users      GET  403      public_events     GET  200
registrations    GET  403
funds            GET  403      POST public_donations  403
hundi_sessions   GET  403      POST donations         403
counters         GET  403      POST audit_logs        403
                               POST admin_users       403
```

## Residual risks

Stated plainly rather than omitted.

1. **No rate limiting on public writes.** Anyone can submit complaints or
   registrations in bulk. Firestore rules cannot count requests over time.
   Mitigation requires App Check (needs console setup) or Cloud Functions
   (needs billing). **Unmitigated today.**
2. **Registration IDs are derived from a phone number by a public algorithm.**
   Someone who knows a person's number could construct their registration
   document ID. They still cannot read it (`read` is admin-only), but they could
   block that person from registering by claiming the ID first. Low impact,
   documented rather than hidden.
3. **No App Check**, so the API key can be used from outside the site. The
   security rules are what actually protect the data, and they were tested from
   outside the site — but abuse-volume protection is absent.
4. **`config` is world-readable** by design. Correct today; a future developer
   adding a secret there would create a leak. The rule carries a comment saying so.
5. **Aggregates are not authoritative.** `public_stats` is a convenience
   read-model. If it drifts from the ledger, the ledger is correct. Without
   Cloud Functions there is no automatic reconciliation.
6. **Publish is two sequential writes**, not atomic (Firestore evaluates batched
   writes against pre-batch state, so the projection rule would reject a batch).
   A failure between them leaves a record published internally but not publicly —
   visible to the committee, missing from the public page. `publishDonation` is
   idempotent and the UI exposes "Re-sync public copy" to repair it.
