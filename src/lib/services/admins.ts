"use client";

/**
 * Administrator directory & role management service.
 *
 * Managed strictly by SUPER_ADMIN. Security rules enforce that no administrator
 * may edit their own role record (`request.auth.uid != uid`), eliminating self-promotion.
 */

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { can, type AdminIdentity, type Role } from "@/lib/domain/rbac";
import { recordAudit } from "./audit";
import { WorkflowError } from "./donations";

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  createdBy: string;
  createdAt?: unknown;
}

function requireSuperAdmin(actor: AdminIdentity): void {
  if (!can(actor, "admin:manage")) {
    throw new WorkflowError("Only the Super Admin may manage committee accounts.", "MISSING_PERMISSION");
  }
}

export async function listAdministrators(actor: AdminIdentity): Promise<AdminUserRecord[]> {
  requireSuperAdmin(actor);
  const snapshot = await getDocs(query(collection(db(), "admin_users"), orderBy("displayName", "asc")));
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }) as AdminUserRecord);
}

export interface ProvisionAdminInput {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
}

export async function provisionAdministrator(
  actor: AdminIdentity,
  input: ProvisionAdminInput,
): Promise<void> {
  requireSuperAdmin(actor);

  if (actor.uid === input.uid) {
    throw new WorkflowError("You cannot provision or modify your own account record.", "SELF_MODIFICATION");
  }
  if (!input.email.trim()) {
    throw new WorkflowError("Email address is required.", "VALIDATION");
  }
  if (!input.displayName.trim()) {
    throw new WorkflowError("Display name is required.", "VALIDATION");
  }

  const ref = doc(db(), "admin_users", input.uid);
  const record = {
    email: input.email.trim(),
    displayName: input.displayName.trim(),
    role: input.role,
    status: "ACTIVE" as const,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, record);
  await recordAudit(actor, {
    action: "ADMIN_CREATED",
    resourceType: "admin",
    resourceId: input.uid,
    summary: `Granted ${input.role} access to ${input.displayName} (${input.email})`,
    after: { role: input.role, email: input.email },
  });
}

export async function updateAdminRole(
  actor: AdminIdentity,
  targetUid: string,
  newRole: Role,
): Promise<void> {
  requireSuperAdmin(actor);

  if (actor.uid === targetUid) {
    throw new WorkflowError("You cannot edit your own role.", "SELF_MODIFICATION");
  }

  const ref = doc(db(), "admin_users", targetUid);
  await updateDoc(ref, {
    role: newRole,
  });

  await recordAudit(actor, {
    action: "ADMIN_ROLE_CHANGED",
    resourceType: "admin",
    resourceId: targetUid,
    summary: `Changed committee role of user ${targetUid} to ${newRole}`,
    after: { role: newRole },
  });
}

export async function updateAdminStatus(
  actor: AdminIdentity,
  targetUid: string,
  newStatus: "ACTIVE" | "SUSPENDED",
): Promise<void> {
  requireSuperAdmin(actor);

  if (actor.uid === targetUid) {
    throw new WorkflowError("You cannot suspend your own account.", "SELF_MODIFICATION");
  }

  const ref = doc(db(), "admin_users", targetUid);
  await updateDoc(ref, {
    status: newStatus,
  });

  await recordAudit(actor, {
    action: "ADMIN_SUSPENDED",
    resourceType: "admin",
    resourceId: targetUid,
    summary: `${newStatus === "SUSPENDED" ? "Suspended" : "Reactivated"} committee access for user ${targetUid}`,
    after: { status: newStatus },
  });
}
