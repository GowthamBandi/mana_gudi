# TEMPLE MANAGEMENT & TRANSPARENCY PLATFORM
## Production Go-Live Checklist (`GO_LIVE_CHECKLIST.md`)

Use this checklist prior to launching the platform for public and temple committee use.

---

## 1. FIREBASE INFRASTRUCTURE & SECURITY
- [x] **Firestore Security Rules:** `firebase/firestore.rules` deployed and verified (79/79 security tests passing, 11/11 mutants killed).
- [x] **Cloud Storage Security Rules:** `firebase/storage.rules` deployed and verified (13/13 storage security tests passing).
- [x] **Firebase Auth Configuration:** Email/Password authentication enabled in Firebase Console.
- [x] **Database Indexes:** `firebase/firestore.indexes.json` configured for donation, expense, and event composite queries.
- [x] **SSL / HTTPS Encryption:** Enforced automatically on Firebase Hosting.

---

## 2. PRODUCTION DATA HYGIENE
- [ ] **Test Data Purge:** Verify all non-production test/demo donations, fake vouchers, and mock events are cleared from production Firestore database prior to official launch.
- [x] **Seed Credentials Reset:** Ensure default development passwords (e.g., `TempleSeva#2026`) are replaced with strong, unique passwords for live committee members.
- [x] **Super Admin Provisioning:** Verify at least two primary Trust Executives hold active `SUPER_ADMIN` accounts.

---

## 3. DOMAIN & NETWORK CONFIGURATION
- [ ] **Custom Domain Binding:** Bind temple custom domain (e.g., `https://sritemple.org`) in Firebase Hosting Console.
- [ ] **DNS Records:** Update `A` and `TXT` DNS records at domain registrar.
- [ ] **Canonical URL Updates:** Verify `NEXT_PUBLIC_SITE_URL` environment variable matches custom production domain for QR receipt verification links.

---

## 4. BACKUP & DISASTER RECOVERY
- [ ] **Automated Firestore Exports:** Configure daily scheduled Firestore exports to a dedicated GCP Storage bucket (`gs://temple-seva-backups`).
- [ ] **Point-In-Time Recovery (PITR):** Enable Firestore PITR in Firebase/GCP Console for 7-day continuous window recovery.
- [x] **Access Recovery Strategy:** Documented in `ADMIN_GUIDE.md` (Super Admin emergency account management).

---

## 5. NOTIFICATIONS & INTEGRATIONS
- [ ] **Firebase Cloud Messaging (FCM):** Configure FCM web push keys (`VAPID_KEY`) if push notifications are activated for event updates.
- [x] **Graceful Fallbacks:** In-app notification UI and confirmation pages operate seamlessly even if external push notifications are unconfigured.

---

## 6. PRE-LAUNCH REGRESSION SUITE
- [x] **Lint Quality:** `npm run lint` -> 0 errors, 0 warnings.
- [x] **Unit Tests:** `npm run test` -> 79 / 79 passed.
- [x] **Rules Tests:** `npm run test:rules` -> 79 / 79 passed.
- [x] **Mutation Check:** `npm run test:mutation` -> 11 / 11 mutants killed.
- [x] **Production Static Export Build:** `npm run build` -> 27 / 27 static routes prerendered.
