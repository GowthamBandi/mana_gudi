# Evidence Log

Every claim in this file is backed by a command that was actually run and whose
output was actually read. Where something is unverified, it says so.

---

## Phase 0 — Environment reconstruction

| Check | Command | Result |
|---|---|---|
| Workspace state | `ls -la /Users/bandigowtham` | **Not empty — it is the user's home directory.** Contains `Library/`, `Documents/`, `upload-keystore.jks`, dotfiles. |
| Node / npm | `node -v`, `npm -v` | v26.5.0 / 11.17.0 |
| Alternative package managers | `pnpm -v`, `yarn -v`, `bun -v` | none installed → **npm** |
| Firebase CLI | `firebase --version` | 15.24.0 |
| Firebase account | `firebase login:list` | `frameingos@gmail.com` |
| Existing projects | `firebase projects:list` | 7 projects, **none temple-related** |
| Java (emulator dependency) | `java -version` | OpenJDK 21.0.10 |
| Playwright | `npx playwright --version` | 1.62.1 |
| gcloud | `which gcloud` | **not installed** |

### Decision: project location

The VS Code workspace root is `$HOME`. Scaffolding into it directly would have
scattered `package.json`, `node_modules/`, and `firebase.json` across the user's
home directory and placed a git repository over their entire personal filesystem.
The project was therefore isolated to `/Users/bandigowtham/temple-platform/`.

### Decision: no Cloud Functions

`firebase functions:list` fails on the new project — Cloud Functions requires the
Blaze (paid) plan, and no billing account is attached. Rather than block, the
architecture was designed so that **Firestore Security Rules are the primary
authorization boundary**. Rules execute on Google's infrastructure, are free, and
cannot be bypassed by a modified client. See `docs/ARCHITECTURE.md`.

---

## Phase 1 — Firebase resources created

| Resource | Identifier | Evidence |
|---|---|---|
| Firebase project | `temple-seva-platform` | `firebase projects:create` → "Your Firebase project is ready" |
| Web app | `1:218753917957:web:51897c179643f096eba86c` | `firebase apps:create WEB` |
| Firestore database | `(default)` | created during `firebase deploy --only firestore` |
| Firestore rules | deployed | "released rules firebase/firestore.rules to cloud.firestore" |
| Firestore indexes | 10 composite indexes deployed | "deployed indexes ... successfully" |

Note: `firestore.googleapis.com` was not enabled on the fresh project. A script to
enable it via the Service Usage API was **blocked by the sandbox permission
classifier**, and was not worked around. The Firebase CLI enabled the API itself
during `firebase deploy`, which is the supported path.

---

## Phase 2 — Domain unit tests

```
$ npx vitest run
Test Files  4 passed (4)
     Tests  75 passed (75)
```

Covers: integer-paise money arithmetic (including the 0.1 + 0.2 float trap),
Indian digit grouping, the financial state machine, the RBAC matrix, donor-name
masking, reference-number parsing, and duplicate-registration ID derivation.

---

## Phase 3 — Security rules tested against the real emulator

```
$ firebase emulators:exec --only firestore "npx vitest run --config vitest.rules.config.mts"
Test Files  2 passed (2)
     Tests  73 passed (73)
```

These are not assertions about code — they are real Firestore operations issued
through the client SDK exactly as a modified browser would issue them.

### Mutation testing — proving the tests can actually fail

A suite of `assertFails()` checks can pass for the wrong reason. So the rules were
deliberately broken, one guarantee at a time, to confirm the suite notices:

```
$ node scripts/mutation-check.mjs
Running 11 rule mutants
✓ killed — financial records become deletable by super admin
✓ killed — the correction witness gate is disabled entirely
✓ killed — a revision may lie about the value it replaces
✓ killed — the revision ledger becomes rewritable
✓ killed — revisions may be written out of sequence
✓ killed — the creator may verify their own donation
✓ killed — the audit log becomes editable
✓ killed — public donation projections lose their field allowlist
✓ killed — internal donations become world-readable
✓ killed — suspended administrators keep their powers
✓ killed — administrators may edit their own role
11/11 mutants killed
```

**Finding (resolved during this phase.** The first mutation run had a survivor:
removing the bare `exists(revPath)` check from the correction gate was not
detected. Investigation showed this is an *equivalent mutant* — `get()` on a
missing document raises an evaluation error and denies the write regardless, so
security was not actually weakened. The mutant was replaced with one that
disables the entire witness gate, which the suite kills. The lesson is recorded
rather than hidden: a surviving mutant must be explained, not deleted.

---

## Phase 4 — Application build and verification

_(recorded below as it happens)_
