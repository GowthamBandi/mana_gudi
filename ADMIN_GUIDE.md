# TEMPLE MANAGEMENT & TRANSPARENCY PLATFORM
## Operational Administrator Guide (`ADMIN_GUIDE.md`)

Welcome to the official operational guide for the **Sri Temple Seva Management & Transparency Platform**. 

This document explains how temple committee members, treasurers, event organizers, and auditors interact with the platform safely and effectively.

---

## 1. COMMITTEE ROLES & PERMISSIONS

The platform enforces Strict Role-Based Access Control (RBAC). Your assigned role determines what you can see and do.

| Role | Primary Responsibility | Key Permissions | What You CANNOT Do |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Committee President & Trust Executives | Full administrative authority, member provisioning, role assignments, financial & event management, audit inspection | Cannot erase append-only audit history |
| `FINANCE_ADMIN` | Temple Treasurers & Financial Secretaries | Record & publish donations, create & publish expense vouchers, upload private proof evidence, record witnessed corrections | Access admin user provisioning |
| `EVENT_ADMIN` | Festival & Pooja Coordinators | Create & publish events, manage timings and schedules, view devotee participant registrations | Access financial ledgers |
| `CONTENT_ADMIN` | Temple Information Officers | Publish temple announcements, manage photo gallery, upload public documents | Access financial ledgers or delete audit records |
| `AUDITOR` | Independent Advisory & Supervisory Board | Read-only inspection of all financial ledgers, correction registers, and immutable audit logs | Modify, create, or delete any record |
| `VOLUNTEER` | Temple Seva Volunteers | View event participant lists and assist with festival operations | Access administrative or financial settings |

---

## 2. LOGIN & AUTHENTICATION

1. Open your browser and navigate to `/admin/login` (e.g., `https://temple.domain/admin/login`).
2. Enter your assigned **Committee Email Address** and **Password**.
3. Click **Sign In**.
4. Upon successful login, you will be redirected to the **Mobile-First Admin Overview Dashboard**.
5. Your session token remains active during your browser session. Clicking **Sign Out** immediately revokes access.

---

## 3. SINGLE-AUTHORITY FINANCIAL WORKFLOWS

Financial creation uses a single-authority immediate publication model. An authorized committee member creates a record, optionally attaches supporting proof, and submits it — publishing it immediately to public accounts.

### A. Recording & Publishing a Donation
1. Go to **Donations** (`/admin/donations`).
2. Click **New Donation**.
3. Fill in Donor Name, Amount (in ₹), Purpose (e.g., *Gopuram Repair*), Date Received, and Payment Method.
4. (Optional) Click **Upload Payment Proof / Receipt** to attach a photo or PDF proof document.
5. Click **Submit & Publish Donation**.
6. The system generates a sequential receipt number (e.g., `DON-2026-00042`) and publishes the donation immediately to public transparency accounts and receipt verification (`/verify?ref=DON-2026-00042`).

### B. Recording & Publishing an Expense Voucher
1. Go to **Expenses** (`/admin/expenses`).
2. Click **New Expense Voucher**.
3. Enter Category (e.g., *Annadanam Provisions*), Description, Amount (in ₹), Payee/Vendor Name, and Expense Date.
4. (Optional) Click **Upload Bill / Voucher Proof** to attach invoice/bill evidence.
5. Click **Submit & Publish Expense**.
6. The system generates a sequential voucher number (e.g., `EXP-2026-00015`) and publishes the voucher immediately to public transparency accounts.

---

## 4. PROOF STORAGE & PRIVACY

- Uploaded payment screenshots, receipts, and vendor invoices are stored in secure, private Cloud Storage paths (`proofs/donations/*` and `proofs/expenses/*`).
- Proof files are restricted to authorized financial committee members and auditors. They are not exposed to anonymous public website visitors.

---

## 5. MAKING FINANCIAL CORRECTIONS

The platform enforces **immutable ledger integrity**. Published financial records can NEVER be silently altered or erased.

### How to Correct a Published Record:
1. Locate the published donation or expense voucher in the admin list.
2. Click **Correct Record**.
3. Enter the corrected values (e.g., amount or description).
4. Enter a **Mandatory Reason** for the correction (e.g., *"Receipt typo corrected per bank deposit slip"*).
5. Click **Record Correction**.
6. **Result:** The system creates an immutable historical revision snapshot (`/revisions/1`). The public page displays the updated current value along with a permanent public record in the **Corrections Register** (`/transparency/corrections`).

---

## 6. MANAGING TEMPLE EVENTS & POOJAS

1. Go to **Events** (`/admin/events`).
2. Click **Create New Event**.
3. Enter Event Title, Pooja Type, Deity, Date & Time, Location, and Capacity.
4. Click **Submit & Publish Event**. The event appears immediately on the public `/events` page.
5. Click **View Registrations** on any event to inspect devotee participant lists.

---

## 7. INSPECTING AUDIT LOGS

1. Auditors and Super Admins can access **Audit Logs** at `/admin/audit`.
2. Every administrative action (logins, donation creation, expense vouchers, corrections, account changes) is recorded automatically with timestamps, actor IDs, and action details.
3. Use the **Resource Filter** or **Search Box** to locate specific actions.
4. Click **View Details** on any entry to inspect before-and-after snapshot diffs.
