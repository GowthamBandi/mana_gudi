# TEMPLE MANAGEMENT & TRANSPARENCY PLATFORM
## Human Actions Required Prior to Go-Live (`HUMAN_ACTION_REQUIRED.md`)

The technical platform, security rules, RBAC, financial controls, and static build are **100% complete and certified**. 

The following items are human-only administrative and operational actions that must be completed by the Temple Trust Executives prior to opening the system for live public use.

---

## 1. CUSTOM DOMAIN DNS CONFIGURATION
- **Action:** Bind official temple custom domain (e.g., `https://sritemple.org` or `https://managudi.org`) to Firebase Hosting.
- **Why Needed:** Currently running on default Firebase staging URL (`temple-seva-platform.web.app`). Devotee trust is maximized when using an official domain.
- **Exact Steps:**
  1. Open Firebase Console -> Hosting -> Add Custom Domain.
  2. Enter temple domain.
  3. Add the generated `A` and `TXT` records to your DNS provider (e.g., GoDaddy, Cloudflare, Namecheap).
  4. Update `NEXT_PUBLIC_SITE_URL` in environment configuration to match the custom domain.
- **Risk:** Low (Cosmetic & branding; system is fully functional without custom domain).
- **Time Required:** 15 minutes.

---

## 2. PRODUCTION TRUSTEE ACCOUNT PROVISIONING & PASSWORD RESET
- **Action:** Provision real committee member emails and reset default passwords.
- **Why Needed:** Development seed accounts use default password (`TempleSeva#2026`).
- **Exact Steps:**
  1. Super Admin logs into `/admin/administrators`.
  2. Provision real committee emails (President, Treasurer, Joint Treasurer, Auditor).
  3. Send credentials to trustees and perform password reset.
- **Risk:** High if default passwords are retained in production.
- **Time Required:** 30 minutes.

---

## 3. FIRESTORE AUTOMATED BACKUP SCHEDULING
- **Action:** Enable automated daily Firestore exports to Google Cloud Storage.
- **Why Needed:** Protection against accidental database corruption or disaster recovery scenarios.
- **Exact Steps:**
  1. Go to GCP Console -> Firestore -> Backups.
  2. Enable Daily Scheduled Backups to bucket `gs://temple-seva-backups`.
  3. Enable 7-Day Point-in-Time Recovery (PITR).
- **Risk:** Medium (Backups ensure long-term data safety).
- **Time Required:** 10 minutes in GCP Console.

---

## 4. DESTRUCTIVE CLEANUP OF LOCAL SEED / DEMO DATA (PRIOR TO DEPLOYMENT)
- **Action:** Ensure production Firestore database is initialized clean without local seed records.
- **Why Needed:** Seed script generates sample donations and expenses for local evaluation. Production database must begin clean with real temple opening balances.
- **Exact Steps:**
  1. Verify target Firebase project in `.firebaserc`.
  2. Initialize production database with actual opening balances and fund definitions.
- **Risk:** High if test data is pushed to live public ledger.
- **Time Required:** 20 minutes.
