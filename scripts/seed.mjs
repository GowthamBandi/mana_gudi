/**
 * Seeds a working temple dataset.
 *
 * Runs against the Firebase emulators by default (no credentials needed). The
 * Admin SDK connects to the emulator automatically when FIRESTORE_EMULATOR_HOST
 * and FIREBASE_AUTH_EMULATOR_HOST are set, which `npm run seed` does.
 *
 * Seeded donations are written directly in their final state so the public site
 * has content to show. The two-person workflow itself is exercised by the E2E
 * tests, not faked here.
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "temple-seva-platform";
const PASSWORD = process.env.SEED_PASSWORD ?? "TempleSeva#2026";

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

const ADMINS = [
  { uid: "seed-super", email: "super@temple.test", role: "SUPER_ADMIN", name: "Committee President" },
  { uid: "seed-finance-1", email: "treasurer@temple.test", role: "FINANCE_ADMIN", name: "Temple Treasurer" },
  { uid: "seed-finance-2", email: "finance2@temple.test", role: "FINANCE_ADMIN", name: "Joint Treasurer" },
  { uid: "seed-events", email: "events@temple.test", role: "EVENT_ADMIN", name: "Events Coordinator" },
  { uid: "seed-content", email: "content@temple.test", role: "CONTENT_ADMIN", name: "Notices Volunteer" },
  { uid: "seed-auditor", email: "auditor@temple.test", role: "AUDITOR", name: "Village Auditor" },
];

const FUNDS = [
  { id: "fund-general", name: "General Fund", description: "Day-to-day running of the temple", restricted: false, order: 1 },
  { id: "fund-annadanam", name: "Annadanam Fund", description: "Free meals for devotees", restricted: true, order: 2 },
  { id: "fund-development", name: "Temple Development Fund", description: "Repairs and construction", restricted: true, order: 3 },
  { id: "fund-festivals", name: "Festivals Fund", description: "Annual festivals and utsavams", restricted: true, order: 4 },
];

const DONATIONS = [
  { id: "don-1", seq: 1, name: "Ramesh Kumar", display: "FULL", paise: 2500000, purpose: "Annadanam", fund: "fund-annadanam", method: "UPI", day: 8 },
  { id: "don-2", seq: 2, name: "Lakshmi Devi", display: "MASKED", paise: 1000000, purpose: "Temple Development", fund: "fund-development", method: "BANK_TRANSFER", day: 12 },
  { id: "don-3", seq: 3, name: "Suresh Babu", display: "ANONYMOUS", paise: 500000, purpose: "General Donation", fund: "fund-general", method: "CASH", day: 15 },
  { id: "don-4", seq: 4, name: "Venkata Rao", display: "FULL", paise: 15000000, purpose: "Gopuram Repair", fund: "fund-development", method: "CHEQUE", day: 20 },
  { id: "don-5", seq: 5, name: "Padma Sri", display: "FULL", paise: 300000, purpose: "Festival Expenses", fund: "fund-festivals", method: "UPI", day: 22 },
  { id: "don-6", seq: 6, name: "Anonymous Hundi Collection", display: "ANONYMOUS", paise: 4275000, purpose: "Hundi Collection", fund: "fund-general", method: "HUNDI", day: 25 },
];

const EXPENSES = [
  { id: "exp-1", seq: 1, category: "Annadanam", description: "Rice and provisions for Sunday annadanam", paise: 1850000, fund: "fund-annadanam", payee: "Village Provisions Store", day: 10 },
  { id: "exp-2", seq: 2, category: "Maintenance", description: "Gopuram whitewashing and repair", paise: 9500000, fund: "fund-development", payee: "Local Contractor", day: 18 },
  { id: "exp-3", seq: 3, category: "Electricity", description: "Temple electricity bill (quarter)", paise: 420000, fund: "fund-general", payee: "State Electricity Board", day: 21 },
  { id: "exp-4", seq: 4, category: "Priest Honorarium", description: "Monthly honorarium to temple priests", paise: 2500000, fund: "fund-general", payee: "Temple Priests", day: 28 },
];

const EVENTS = [
  {
    id: "evt-shivaratri",
    title: "Maha Shivaratri Homam",
    description: "The annual all-night homam with abhishekam through the four yamas. All devotees are welcome.",
    deity: "Lord Shiva", eventType: "HOMAM", location: "Main Mandapam",
    capacity: 150, registrationRequired: true, feePaise: 0, daysAhead: 21,
    instructions: "Please arrive by 5:30 pm. Wear traditional dress if possible.",
    materials: "Bring a coconut and flowers if you wish to make an offering.",
  },
  {
    id: "evt-annadanam",
    title: "Monthly Annadanam",
    description: "Free meals served to all devotees after the morning pooja on the first Sunday of every month.",
    deity: "", eventType: "ANNADANAM", location: "Temple Dining Hall",
    capacity: 0, registrationRequired: false, feePaise: 0, daysAhead: 9,
    instructions: "", materials: "",
  },
  {
    id: "evt-satyanarayana",
    title: "Satyanarayana Vratam",
    description: "Group Satyanarayana pooja performed on the full moon day. Families may register to participate together.",
    deity: "Lord Vishnu", eventType: "POOJA", location: "Kalyana Mandapam",
    capacity: 40, registrationRequired: true, feePaise: 25000, daysAhead: 14,
    instructions: "Gotram and nakshatram are needed for the sankalpam.",
    materials: "Fruits and flowers for the offering.",
  },
  {
    id: "evt-cleaning",
    title: "Temple Cleaning Seva",
    description: "Volunteers needed to clean the prakaram and premises ahead of the festival season.",
    deity: "", eventType: "VOLUNTEER", location: "Temple Premises",
    capacity: 30, registrationRequired: true, feePaise: 0, daysAhead: 5,
    instructions: "Bring gloves if you have them. Refreshments provided.",
    materials: "",
  },
];

const ANNOUNCEMENTS = [
  { id: "ann-1", title: "Maha Shivaratri — extended darshan timings", category: "FESTIVAL", pinned: true,
    body: "The temple will remain open through the night of Maha Shivaratri. Darshan will be continuous from 6:00 am until 6:00 am the following day. Additional queue arrangements will be in place." },
  { id: "ann-2", title: "Temple accounts for the year now published", category: "CAMPAIGN", pinned: false,
    body: "All donations and expenses for the year are now published on the Transparency page. Any devotee may inspect them. Receipts can be checked using the receipt number." },
  { id: "ann-3", title: "Water supply work — morning timings changed on Tuesday", category: "TIMINGS", pinned: false,
    body: "Because of water supply work in the village, the temple will open at 7:30 am instead of 6:00 am on Tuesday. Evening timings are unchanged." },
];

function dayOf(day) {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(day);
  date.setHours(9, 0, 0, 0);
  return Timestamp.fromDate(date);
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 30, 0, 0);
  return Timestamp.fromDate(date);
}

function pad(n) {
  return String(n).padStart(5, "0");
}

function publicName(name, display) {
  if (display === "ANONYMOUS") return "Anonymous Devotee";
  if (display === "MASKED") {
    return name
      .split(/\s+/)
      .map((part) => (part.length === 1 ? part : part[0] + "*".repeat(part.length - 1)))
      .join(" ");
  }
  return name;
}

async function seedAdministrators() {
  for (const admin of ADMINS) {
    try {
      await auth.createUser({
        uid: admin.uid,
        email: admin.email,
        password: PASSWORD,
        displayName: admin.name,
        emailVerified: true,
      });
    } catch (error) {
      if (error.code !== "auth/uid-already-exists" && error.code !== "auth/email-already-exists") {
        throw error;
      }
      await auth.updateUser(admin.uid, { password: PASSWORD });
    }

    await db.doc(`admin_users/${admin.uid}`).set({
      role: admin.role,
      status: "ACTIVE",
      displayName: admin.name,
      email: admin.email,
      createdBy: "seed-super",
      createdAt: Timestamp.now(),
    });
  }
  console.log(`  ${ADMINS.length} administrators (password: ${PASSWORD})`);
}

async function seedFunds() {
  const totals = {};
  for (const fund of FUNDS) totals[fund.id] = { in: 0, out: 0 };
  for (const d of DONATIONS) totals[d.fund].in += d.paise;
  for (const e of EXPENSES) totals[e.fund].out += e.paise;

  for (const fund of FUNDS) {
    const payload = {
      name: fund.name,
      description: fund.description,
      totalInPaise: totals[fund.id].in,
      totalOutPaise: totals[fund.id].out,
      balancePaise: totals[fund.id].in - totals[fund.id].out,
      restricted: fund.restricted,
      updatedAt: Timestamp.now(),
      order: fund.order,
    };
    await db.doc(`funds/${fund.id}`).set(payload);
    await db.doc(`public_funds/${fund.id}`).set(payload);
  }
  console.log(`  ${FUNDS.length} funds`);
}

async function seedFinancials() {
  const year = new Date().getFullYear();
  const fundName = (id) => FUNDS.find((f) => f.id === id)?.name ?? "General Fund";

  for (const d of DONATIONS) {
    const receiptNo = `DON-${year}-${pad(d.seq)}`;
    await db.doc(`donations/${d.id}`).set({
      receiptNo,
      donorName: d.name,
      donorPhone: "98765" + pad(d.seq).slice(0, 5),
      donorEmail: null,
      donorAddress: "Village Centre",
      displayPreference: d.display,
      amountPaise: d.paise,
      currency: "INR",
      purpose: d.purpose,
      fundId: d.fund,
      occurredAt: dayOf(d.day),
      paymentMethod: d.method,
      referenceNo: null,
      status: "PUBLISHED",
      createdBy: "seed-finance-1",
      createdAt: dayOf(d.day),
      submittedBy: "seed-finance-1",
      verifiedBy: "seed-finance-2",
      verifiedAt: dayOf(d.day),
      publishedBy: "seed-finance-2",
      publishedAt: dayOf(d.day),
      rejectionReason: null,
      lastCorrectionReason: null,
      revisionCount: 0,
    });

    await db.doc(`public_donations/${d.id}`).set({
      receiptNo,
      displayName: publicName(d.name, d.display),
      amountPaise: d.paise,
      currency: "INR",
      purpose: d.purpose,
      fundId: d.fund,
      fundName: fundName(d.fund),
      occurredAt: dayOf(d.day),
      publishedAt: dayOf(d.day),
      paymentMethod: d.method,
      revisionCount: 0,
      corrected: false,
      status: "PUBLISHED",
    });
  }

  for (const e of EXPENSES) {
    const voucherNo = `EXP-${year}-${pad(e.seq)}`;
    await db.doc(`expenses/${e.id}`).set({
      voucherNo,
      category: e.category,
      description: e.description,
      amountPaise: e.paise,
      currency: "INR",
      fundId: e.fund,
      payeeDisplay: e.payee,
      occurredAt: dayOf(e.day),
      status: "PUBLISHED",
      createdBy: "seed-finance-1",
      createdAt: dayOf(e.day),
      verifiedBy: "seed-super",
      publishedBy: "seed-super",
      rejectionReason: null,
      lastCorrectionReason: null,
      revisionCount: 0,
    });

    await db.doc(`public_expenses/${e.id}`).set({
      voucherNo,
      category: e.category,
      description: e.description,
      amountPaise: e.paise,
      currency: "INR",
      fundId: e.fund,
      fundName: fundName(e.fund),
      payeeDisplay: e.payee,
      occurredAt: dayOf(e.day),
      publishedAt: dayOf(e.day),
      revisionCount: 0,
      corrected: false,
      status: "PUBLISHED",
    });
  }

  await db.doc(`counters/donations-${year}`).set({ seq: DONATIONS.length });
  await db.doc(`counters/expenses-${year}`).set({ seq: EXPENSES.length });

  console.log(`  ${DONATIONS.length} donations, ${EXPENSES.length} expenses`);
}

async function seedStats() {
  const byPurpose = {};
  for (const d of DONATIONS) byPurpose[d.purpose] = (byPurpose[d.purpose] ?? 0) + d.paise;
  const byCategory = {};
  for (const e of EXPENSES) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.paise;

  const totalDonations = DONATIONS.reduce((sum, d) => sum + d.paise, 0);
  const totalExpenses = EXPENSES.reduce((sum, e) => sum + e.paise, 0);

  await db.doc("public_stats/all-time").set({
    totalDonationsPaise: totalDonations,
    totalExpensesPaise: totalExpenses,
    balancePaise: totalDonations - totalExpenses,
    donationCount: DONATIONS.length,
    expenseCount: EXPENSES.length,
    byPurpose,
    byCategory,
    byMonth: {},
    updatedAt: Timestamp.now(),
  });
  console.log("  aggregate statistics");
}

async function seedEvents() {
  for (const event of EVENTS) {
    const payload = {
      title: event.title,
      description: event.description,
      deity: event.deity,
      eventType: event.eventType,
      startAt: daysFromNow(event.daysAhead),
      endAt: daysFromNow(event.daysAhead),
      location: event.location,
      capacity: event.capacity,
      registrationRequired: event.registrationRequired,
      registrationOpen: true,
      feePaise: event.feePaise,
      instructions: event.instructions,
      materials: event.materials,
      status: "PUBLISHED",
      registrationCount: 0,
      updatedAt: Timestamp.now(),
    };
    await db.doc(`events/${event.id}`).set(payload);
    await db.doc(`public_events/${event.id}`).set(payload);
  }
  console.log(`  ${EVENTS.length} events`);
}

async function seedAnnouncements() {
  for (const announcement of ANNOUNCEMENTS) {
    await db.doc(`public_announcements/${announcement.id}`).set({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      status: "PUBLISHED",
      publishedAt: Timestamp.now(),
      expiresAt: null,
      pinned: announcement.pinned,
    });
  }
  console.log(`  ${ANNOUNCEMENTS.length} announcements`);
}

async function seedProfile() {
  await db.doc("temple_profile/main").set({
    name: "Sri Temple Seva",
    deity: "Presiding Deity",
    village: "Village Centre",
    address: "Temple Street, Village Centre, Andhra Pradesh",
    phone: "",
    email: "",
    about: "A village temple run by an elected committee, with fully public accounts.",
    history: "The temple has served this village for generations.",
    timings: [
      { label: "Morning", from: "6:00 am", to: "11:30 am" },
      { label: "Evening", from: "5:00 pm", to: "8:30 pm" },
    ],
    poojaSchedule: [
      { name: "Suprabhatam", time: "6:00 am", note: "" },
      { name: "Abhishekam", time: "7:30 am", note: "" },
      { name: "Archana", time: "11:00 am", note: "" },
      { name: "Deeparadhana", time: "6:30 pm", note: "" },
    ],
    mapUrl: "",
  });
  console.log("  temple profile");
}

console.log(`Seeding ${PROJECT_ID}…`);
await seedAdministrators();
await seedFunds();
await seedFinancials();
await seedStats();
await seedEvents();
await seedAnnouncements();
await seedProfile();
console.log("Seed complete.");
process.exit(0);
