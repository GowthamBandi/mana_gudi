"use client";

/**
 * Event management service for committee administrators.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import { recordAudit } from "./audit";
import { WorkflowError } from "./donations";
import type { EventType, Registration, TempleEvent } from "./types";

function requirePermission(actor: AdminIdentity, permission: Parameters<typeof can>[1]): void {
  if (!can(actor, permission)) {
    throw new WorkflowError("You do not have permission to manage events.", "MISSING_PERMISSION");
  }
}

export interface NewEventInput {
  title: string;
  description: string;
  deity?: string;
  eventType: EventType;
  startAt: Date;
  endAt: Date;
  location: string;
  capacity?: number;
  registrationRequired?: boolean;
  registrationOpen?: boolean;
  feePaise?: number;
  instructions?: string;
  materials?: string;
  publishImmediately?: boolean;
}

export async function createEvent(
  actor: AdminIdentity,
  input: NewEventInput,
): Promise<{ id: string }> {
  requirePermission(actor, "event:manage");

  if (!input.title.trim()) {
    throw new WorkflowError("Event title is required.", "VALIDATION");
  }
  if (!input.location.trim()) {
    throw new WorkflowError("Event location is required.", "VALIDATION");
  }

  const ref = doc(collection(db(), "events"));

  const record: Omit<TempleEvent, "id"> = {
    title: input.title.trim(),
    description: input.description.trim(),
    deity: input.deity?.trim() || "",
    eventType: input.eventType,
    startAt: input.startAt,
    endAt: input.endAt,
    location: input.location.trim(),
    capacity: input.capacity ?? 0,
    registrationRequired: input.registrationRequired ?? false,
    registrationOpen: input.registrationOpen ?? true,
    feePaise: input.feePaise ?? 0,
    instructions: input.instructions?.trim() || "",
    materials: input.materials?.trim() || "",
    status: input.publishImmediately ? "PUBLISHED" : "DRAFT",
    registrationCount: 0,
    updatedAt: serverTimestamp() as unknown as import("./types").TimestampLike,
  };

  await setDoc(ref, record);

  if (record.status === "PUBLISHED") {
    await setDoc(doc(db(), "public_events", ref.id), record);
  }

  await recordAudit(actor, {
    action: "EVENT_CREATED",
    resourceType: "event",
    resourceId: ref.id,
    summary: `Created event "${input.title}" (${record.status})`,
    after: { title: input.title, eventType: input.eventType, status: record.status },
  });

  return { id: ref.id };
}

export async function updateEventStatus(
  actor: AdminIdentity,
  id: string,
  newStatus: TempleEvent["status"],
): Promise<void> {
  requirePermission(actor, "event:manage");
  const eventRef = doc(db(), "events", id);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new WorkflowError("Event not found.", "NOT_FOUND");
  const current = snap.data() as TempleEvent;

  await updateDoc(eventRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  const updatedEvent = { ...current, status: newStatus };

  if (newStatus === "PUBLISHED") {
    await setDoc(doc(db(), "public_events", id), updatedEvent);
  } else {
    // Unpublish or update public copy
    await updateDoc(doc(db(), "public_events", id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  await recordAudit(actor, {
    action: "EVENT_STATUS_CHANGED",
    resourceType: "event",
    resourceId: id,
    summary: `Changed event status for "${current.title}" to ${newStatus}`,
    before: { status: current.status },
    after: { status: newStatus },
  });
}

export async function listAdminEvents(): Promise<TempleEvent[]> {
  const snapshot = await getDocs(query(collection(db(), "events"), orderBy("startAt", "desc")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TempleEvent);
}

export async function listEventRegistrations(
  actor: AdminIdentity,
  eventId: string,
): Promise<Registration[]> {
  requirePermission(actor, "registration:read");
  const snapshot = await getDocs(
    query(collection(db(), "registrations"), where("eventId", "==", eventId)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Registration);
}
