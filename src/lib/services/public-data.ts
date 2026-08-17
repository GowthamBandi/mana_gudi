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
import type {
  Announcement,
  Fund,
  PublicCorrection,
  PublicDonation,
  PublicExpense,
  TempleEvent,
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
  const snapshot = await getDocs(query(collection(db(), "public_funds"), orderBy("order", "asc")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Fund);
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
  const snapshot = await getDoc(doc(db(), "public_stats", period));
  return snapshot.exists() ? (snapshot.data() as TempleStats) : null;
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

export async function upcomingEvents(max = 12): Promise<TempleEvent[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), "public_events"),
      where("status", "==", "PUBLISHED"),
      orderBy("startAt", "asc"),
      fbLimit(max),
    ),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TempleEvent);
}

export async function publicEvent(id: string): Promise<TempleEvent | null> {
  const snapshot = await getDoc(doc(db(), "public_events", id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as TempleEvent) : null;
}

export async function announcements(max = 10): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), "public_announcements"),
      where("status", "==", "PUBLISHED"),
      orderBy("publishedAt", "desc"),
      fbLimit(max),
    ),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
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

export async function templeProfile(): Promise<TempleProfile | null> {
  const snapshot = await getDoc(doc(db(), "temple_profile", "main"));
  return snapshot.exists() ? (snapshot.data() as TempleProfile) : null;
}
