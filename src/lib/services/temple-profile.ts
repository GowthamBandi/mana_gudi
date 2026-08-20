"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import { recordAudit } from "./audit";
import { WorkflowError } from "./donations";
import type { TempleProfile } from "./public-data";

export async function updateTempleProfile(
  actor: AdminIdentity,
  profile: Partial<TempleProfile>
): Promise<void> {
  if (!can(actor, "content:manage") && !can(actor, "event:manage")) {
    throw new WorkflowError("You do not have permission to update temple profile and timings.", "MISSING_PERMISSION");
  }

  const docRef = doc(db(), "temple_profile", "main");
  const snap = await getDoc(docRef);
  const current = snap.exists() ? snap.data() : {};

  const updated = {
    ...current,
    ...profile,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updated, { merge: true });

  await recordAudit(actor, {
    action: "TEMPLE_PROFILE_UPDATED",
    resourceType: "temple_profile",
    resourceId: "main",
    summary: "Updated temple profile, darshan timings, and pooja schedule",
    after: { updatedAt: new Date().toISOString() },
  });
}
