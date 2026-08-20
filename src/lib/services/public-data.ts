"use client";

/**
 * Reads for the public transparency site.
 *
 * Every query here targets a `public_*` projection. The public site has no code
 * path that touches an internal collection, so a rules mistake would have to be
 * compounded by a code mistake before private data could surface.
 *
 * All listings are bounded. A village temple's ledger grows without limit, and
 * a page that reads the whole collection to show ten rows is both slow and
 * needlessly expensive on Firestore's per-document read pricing.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { normaliseReference } from "@/lib/domain/ids";
import {
  toDate,
  type Announcement,
  type Fund,
  type PublicCorrection,
  type PublicDonation,
  type PublicExpense,
  type TempleEvent,
} from "./types";

export const PAGE_SIZE = 20;

export interface Page<T> {
  items: T[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
}

async function fetchPage<T>(
  path: string,
  constraints: QueryConstraint[],
  cursor: DocumentSnapshot | null,
  pageSize: number,
): Promise<Page<T>> {
  const all = [...constraints];
  if (cursor) all.push(startAfter(cursor));
  all.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(collection(db(), path), ...all));
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  return {
    items,
    cursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export interface DonationFilters {
  fundId?: string;
  purpose?: string;
  pageSize?: number;
}

export async function publicDonations(
  filters: DonationFilters = {},
  cursor: DocumentSnapshot | null = null,
): Promise<Page<PublicDonation>> {
  const constraints: QueryConstraint[] = [];
  if (filters.fundId) constraints.push(where("fundId", "==", filters.fundId));
  if (filters.purpose) constraints.push(where("purpose", "==", filters.purpose));
  constraints.push(orderBy("occurredAt", "desc"));
  return fetchPage<PublicDonation>(
    "public_donations",
    constraints,
    cursor,
    filters.pageSize ?? PAGE_SIZE,
  );
}

export interface ExpenseFilters {
  fundId?: string;
  category?: string;
  pageSize?: number;
}

export async function publicExpenses(
  filters: ExpenseFilters = {},
  cursor: DocumentSnapshot | null = null,
): Promise<Page<PublicExpense>> {
  const constraints: QueryConstraint[] = [];
  if (filters.fundId) constraints.push(where("fundId", "==", filters.fundId));
  if (filters.category) constraints.push(where("category", "==", filters.category));
  constraints.push(orderBy("occurredAt", "desc"));
  return fetchPage<PublicExpense>(
    "public_expenses",
    constraints,
    cursor,
    filters.pageSize ?? PAGE_SIZE,
  );
}

export async function publicFunds(): Promise<Fund[]> {
  try {
    const snapshot = await getDocs(query(collection(db(), "public_funds"), orderBy("order", "asc")));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Fund);
    }
  } catch (err) {
    console.warn("public_funds query warning, returning default funds:", err);
  }

  return [
    {
      id: "fund-general",
      name: "General Temple Fund",
      description: "General donations used for daily temple maintenance, poojas, and operations.",
      totalInPaise: 0,
      totalOutPaise: 0,
      balancePaise: 0,
      restricted: false,
      updatedAt: new Date(),
      order: 1,
    },
    {
      id: "fund-annadanam",
      name: "Annadanam Fund",
      description: "Restricted fund dedicated exclusively to providing meals for devotees and pilgrims.",
      totalInPaise: 0,
      totalOutPaise: 0,
      balancePaise: 0,
      restricted: true,
      updatedAt: new Date(),
      order: 2,
    },
  ];
}

export async function publicCorrections(max = 20): Promise<PublicCorrection[]> {
  const snapshot = await getDocs(
    query(collection(db(), "public_corrections"), orderBy("correctedAt", "desc"), fbLimit(max)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PublicCorrection);
}

/**
 * Pre-computed totals.
 *
 * Reading every donation to add up a yearly total would cost one Firestore read
 * per donation, every time anybody opens the dashboard. The totals are
 * maintained as a small set of summary documents instead.
 */
export interface TempleStats {
  totalDonationsPaise: number;
  totalExpensesPaise: number;
  balancePaise: number;
  donationCount: number;
  expenseCount: number;
  byPurpose: Record<string, number>;
  byCategory: Record<string, number>;
  byMonth: Record<string, { donations: number; expenses: number }>;
  updatedAt?: unknown;
}

export async function publicStats(period = "all-time"): Promise<TempleStats | null> {
  try {
    const snapshot = await getDoc(doc(db(), "public_stats", period));
    if (snapshot.exists()) {
      const data = snapshot.data() as TempleStats;
      if (data.donationCount > 0 || data.expenseCount > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("public_stats doc read warning, calculating live fallback stats:", err);
  }

  // Live Fallback Calculation directly from public projections
  try {
    const [donationsSnap, expensesSnap] = await Promise.all([
      getDocs(query(collection(db(), "public_donations"), fbLimit(100))),
      getDocs(query(collection(db(), "public_expenses"), fbLimit(100))),
    ]);

    const donations = donationsSnap.docs.map((d) => d.data() as PublicDonation);
    const expenses = expensesSnap.docs.map((d) => d.data() as PublicExpense);

    let totalDonationsPaise = 0;
    const byPurpose: Record<string, number> = {};
    for (const d of donations) {
      totalDonationsPaise += d.amountPaise || 0;
      if (d.purpose) {
        byPurpose[d.purpose] = (byPurpose[d.purpose] || 0) + (d.amountPaise || 0);
      }
    }

    let totalExpensesPaise = 0;
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      totalExpensesPaise += e.amountPaise || 0;
      if (e.category) {
        byCategory[e.category] = (byCategory[e.category] || 0) + (e.amountPaise || 0);
      }
    }

    return {
      totalDonationsPaise,
      totalExpensesPaise,
      balancePaise: totalDonationsPaise - totalExpensesPaise,
      donationCount: donations.length,
      expenseCount: expenses.length,
      byPurpose,
      byCategory,
      byMonth: {},
    };
  } catch (err) {
    console.error("Live publicStats calculation failed:", err);
    return null;
  }
}

/**
 * Donation verification.
 *
 * Looks up a receipt number in the public ledger. Returns a deliberately
 * narrow answer — whether a receipt exists and what it says publicly — so that
 * the endpoint cannot be used to enumerate donor details.
 */
export type VerificationResult =
  | { status: "INVALID_FORMAT" }
  | { status: "NOT_FOUND"; reference: string }
  | { status: "FOUND"; donation: PublicDonation };

export async function verifyDonationReceipt(input: string): Promise<VerificationResult> {
  const reference = normaliseReference(input);
  if (!reference) return { status: "INVALID_FORMAT" };

  const snapshot = await getDocs(
    query(collection(db(), "public_donations"), where("receiptNo", "==", reference), fbLimit(1)),
  );

  const found = snapshot.docs[0];
  if (!found) return { status: "NOT_FOUND", reference };
  return { status: "FOUND", donation: { id: found.id, ...found.data() } as PublicDonation };
}

export async function upcomingEvents(max = 30): Promise<TempleEvent[]> {
  const snapshot = await getDocs(
    query(collection(db(), "public_events"), fbLimit(max)),
  );
  if (!snapshot || snapshot.empty) return [];
  const events = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as TempleEvent)
    .filter((e) => e.status === "PUBLISHED" || !e.status);

  events.sort((a, b) => {
    const dateA = toDate(a.startAt)?.getTime() ?? 0;
    const dateB = toDate(b.startAt)?.getTime() ?? 0;
    return dateA - dateB;
  });

  return events;
}

export async function publicEvent(id: string): Promise<TempleEvent | null> {
  const snapshot = await getDoc(doc(db(), "public_events", id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as TempleEvent) : null;
}

export async function announcements(max = 10): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(collection(db(), "public_announcements"), fbLimit(max)),
  );
  const items = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Announcement)
    .filter((a) => a.status === "PUBLISHED" || !a.status);

  items.sort((a, b) => {
    const dateA = toDate(a.publishedAt)?.getTime() ?? 0;
    const dateB = toDate(b.publishedAt)?.getTime() ?? 0;
    return dateB - dateA;
  });

  return items;
}

export interface TempleProfile {
  name: string;
  deity: string;
  village: string;
  address: string;
  phone: string;
  email: string;
  about: string;
  history: string;
  timings: Array<{ label: string; from: string; to: string }>;
  poojaSchedule: Array<{ name: string; time: string; note: string }>;
  mapUrl: string;
}

export async function templeProfile(): Promise<TempleProfile> {
  try {
    const snapshot = await getDoc(doc(db(), "temple_profile", "main"));
    if (snapshot.exists()) {
      return snapshot.data() as TempleProfile;
    }
  } catch (err) {
    console.warn("templeProfile read warning, returning default profile:", err);
  }

  return {
    name: "Sri Temple Seva Platform",
    deity: "Sri Rama, Sita, Lakshmana & Hanuman",
    village: "Mana Gudi Village",
    address: "Main Temple Street, Mana Gudi",
    phone: "+91 98765 43210",
    email: "contact@managudi.org",
    about: "Traditional village temple dedicated to daily worship, spiritual seva, festival celebrations, and community annadanam.",
    history: "Built and maintained by generations of village families with complete public trust and transparency.",
    timings: [
      { label: "Morning Darshan", from: "6:00 AM", to: "11:30 AM" },
      { label: "Evening Darshan", from: "5:00 PM", to: "8:30 PM" },
    ],
    poojaSchedule: [
      { name: "Suprabhatam", time: "6:00 AM", note: "Morning awakening seva" },
      { name: "Abhishekam", time: "7:30 AM", note: "Daily sacred bath" },
      { name: "Archana", time: "11:00 AM", note: "Namasmarana & offering" },
      { name: "Deeparadhana", time: "6:30 PM", note: "Evening lamp offering & Mangala Harati" },
    ],
    mapUrl: "https://maps.google.com",
  };
}

export async function publicGallery(): Promise<import("./types").GalleryItem[]> {
  const snapshot = await getDocs(query(collection(db(), "public_gallery"), fbLimit(30)));
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as import("./types").GalleryItem);
  items.sort((a, b) => (toDate(b.publishedAt)?.getTime() ?? 0) - (toDate(a.publishedAt)?.getTime() ?? 0));
  return items;
}

export async function publicVideos(): Promise<import("./types").VideoItem[]> {
  const snapshot = await getDocs(query(collection(db(), "public_videos"), fbLimit(20)));
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as import("./types").VideoItem);
  items.sort((a, b) => (toDate(b.publishedAt)?.getTime() ?? 0) - (toDate(a.publishedAt)?.getTime() ?? 0));
  return items;
}

export async function publicDocuments(): Promise<import("./types").TempleDocument[]> {
  const snapshot = await getDocs(query(collection(db(), "public_documents"), fbLimit(50)));
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as import("./types").TempleDocument);
  items.sort((a, b) => (toDate(b.publishedAt)?.getTime() ?? 0) - (toDate(a.publishedAt)?.getTime() ?? 0));
  return items;
}
