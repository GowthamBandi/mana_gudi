import type { Timestamp } from "firebase/firestore";
import type { FinancialStatus } from "@/lib/domain/financial-state";
import type { DisplayPreference } from "@/lib/domain/donor-privacy";
import type { Role } from "@/lib/domain/rbac";

export type TimestampLike = Timestamp | Date;

/** Internal donation record. Carries PII and is never publicly readable. */
export interface Donation {
  id: string;
  receiptNo: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorAddress: string | null;
  displayPreference: DisplayPreference;
  amountPaise: number;
  currency: "INR";
  purpose: string;
  fundId: string;
  occurredAt: TimestampLike;
  paymentMethod: PaymentMethod;
  referenceNo: string | null;
  status: FinancialStatus;
  createdBy: string;
  createdAt: TimestampLike;
  submittedBy?: string | null;
  verifiedBy: string | null;
  verifiedAt?: TimestampLike | null;
  publishedBy: string | null;
  publishedAt?: TimestampLike | null;
  rejectionReason: string | null;
  lastCorrectionReason: string | null;
  revisionCount: number;
  supportingDocPath?: string | null;
}

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
  "HUNDI",
  "IN_KIND",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Expense {
  id: string;
  voucherNo: string;
  category: string;
  description: string;
  amountPaise: number;
  currency: "INR";
  fundId: string;
  payeeDisplay: string;
  occurredAt: TimestampLike;
  status: FinancialStatus;
  createdBy: string;
  createdAt: TimestampLike;
  verifiedBy: string | null;
  publishedBy: string | null;
  publishedAt?: TimestampLike | null;
  rejectionReason: string | null;
  lastCorrectionReason: string | null;
  revisionCount: number;
  supportingDocPath?: string | null;
}

/** Immutable snapshot of a financial record as it stood before a correction. */
export interface Revision {
  id: string;
  snapshot: Record<string, unknown> & {
    amountPaise: number;
    status: FinancialStatus;
    revisionCount: number;
  };
  reason: string;
  correctedBy: string;
  correctedAt: TimestampLike;
}

/** Public read model — deliberately has no donor contact fields at all. */
export interface PublicDonation {
  id: string;
  receiptNo: string;
  displayName: string;
  amountPaise: number;
  currency: "INR";
  purpose: string;
  fundId: string;
  fundName: string;
  occurredAt: TimestampLike;
  publishedAt: TimestampLike;
  paymentMethod: PaymentMethod;
  revisionCount: number;
  corrected: boolean;
  status: "PUBLISHED";
}

export interface PublicExpense {
  id: string;
  voucherNo: string;
  category: string;
  description: string;
  amountPaise: number;
  currency: "INR";
  fundId: string;
  fundName: string;
  payeeDisplay: string;
  occurredAt: TimestampLike;
  publishedAt: TimestampLike;
  revisionCount: number;
  corrected: boolean;
  status: "PUBLISHED";
}

/** Public, permanent notice that a published figure was later changed. */
export interface PublicCorrection {
  id: string;
  recordType: "donation" | "expense";
  recordId: string;
  publicRef: string;
  fromAmountPaise: number;
  toAmountPaise: number;
  reason: string;
  correctedAt: TimestampLike;
  revisionNumber: number;
}

export interface Fund {
  id: string;
  name: string;
  description: string;
  totalInPaise: number;
  totalOutPaise: number;
  balancePaise: number;
  restricted: boolean;
  updatedAt: TimestampLike;
  order: number;
}

export const EVENT_TYPES = [
  "POOJA",
  "HOMAM",
  "FESTIVAL",
  "SPECIAL_DARSHAN",
  "ANNADANAM",
  "VOLUNTEER",
  "CULTURAL",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  POOJA: "Pooja",
  HOMAM: "Homam",
  FESTIVAL: "Festival",
  SPECIAL_DARSHAN: "Special Darshan",
  ANNADANAM: "Annadanam",
  VOLUNTEER: "Volunteer Activity",
  CULTURAL: "Cultural Programme",
};

export interface TempleEvent {
  id: string;
  title: string;
  description: string;
  deity: string;
  eventType: EventType;
  startAt: TimestampLike;
  endAt: TimestampLike;
  location: string;
  capacity: number;
  registrationRequired: boolean;
  registrationOpen: boolean;
  feePaise: number;
  instructions: string;
  materials: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  registrationCount: number;
  updatedAt: TimestampLike;
}

export interface Registration {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  email: string | null;
  gotram: string | null;
  nakshatra: string | null;
  participantCount: number;
  specialRequest: string | null;
  status: "CONFIRMED" | "CANCELLED" | "ATTENDED";
  createdAt: TimestampLike;
}

export interface AuditEntry {
  id: string;
  actorUid: string;
  actorRole: Role;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  at: TimestampLike;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: "FESTIVAL" | "TIMINGS" | "EMERGENCY" | "REMINDER" | "CLOSURE" | "CAMPAIGN";
  status: "PUBLISHED" | "EXPIRED" | "ARCHIVED";
  publishedAt: TimestampLike;
  expiresAt: TimestampLike | null;
  pinned: boolean;
}

export interface Feedback {
  id: string;
  type: "COMPLAINT" | "SUGGESTION";
  message: string;
  contactName: string | null;
  contactPhone: string | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACTION_TAKEN" | "RESOLVED" | "CLOSED";
  createdAt: TimestampLike;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  category: string;
  publishedAt: TimestampLike;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  youtubeId?: string;
  publishedAt: TimestampLike;
}

export interface TempleDocument {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileSizeLabel: string;
  publishedAt: TimestampLike;
}

/** Converts a Firestore Timestamp or a Date into a Date, whichever we got. */
export function toDate(value: TimestampLike | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") return (value as Timestamp).toDate();
  return null;
}
