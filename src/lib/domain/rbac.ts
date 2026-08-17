/**
 * Role-based access control.
 *
 * This module is the single place where "who may do what" is written down.
 * It is used by the UI to decide what to render, but it is NOT the security
 * boundary — firebase/firestore.rules is. The two are kept deliberately
 * parallel so that a permission removed here is also refused by the database.
 */

export const ROLES = [
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "EVENT_ADMIN",
  "CONTENT_ADMIN",
  "AUDITOR",
  "VOLUNTEER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrator",
  FINANCE_ADMIN: "Finance Administrator / Treasurer",
  EVENT_ADMIN: "Event Administrator",
  CONTENT_ADMIN: "Content Administrator",
  AUDITOR: "Auditor (read-only)",
  VOLUNTEER: "Volunteer",
};

export const PERMISSIONS = [
  "donation:read",
  "donation:create",
  "donation:submit",
  "donation:verify",
  "donation:publish",
  "donation:correct",
  "expense:read",
  "expense:create",
  "expense:submit",
  "expense:verify",
  "expense:publish",
  "expense:correct",
  "fund:read",
  "fund:manage",
  "hundi:count",
  "hundi:verify",
  "event:read",
  "event:manage",
  "event:publish",
  "registration:read",
  "registration:manage",
  "content:manage",
  "document:manage",
  "announcement:manage",
  "feedback:read",
  "feedback:manage",
  "volunteer:manage",
  "report:generate",
  "audit:read",
  "admin:manage",
  "config:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const FINANCE_PERMISSIONS: Permission[] = [
  "donation:read",
  "donation:create",
  "donation:submit",
  "donation:verify",
  "donation:publish",
  "donation:correct",
  "expense:read",
  "expense:create",
  "expense:submit",
  "expense:verify",
  "expense:publish",
  "expense:correct",
  "fund:read",
  "fund:manage",
  "hundi:count",
  "hundi:verify",
  "report:generate",
];

const EVENT_PERMISSIONS: Permission[] = [
  "event:read",
  "event:manage",
  "event:publish",
  "registration:read",
  "registration:manage",
  "volunteer:manage",
];

const CONTENT_PERMISSIONS: Permission[] = [
  "content:manage",
  "document:manage",
  "announcement:manage",
  "event:read",
];

/**
 * Auditors see everything financial and every audit entry, and may change
 * nothing. Read-only is enforced by the absence of any ":create"/":manage"
 * permission here and, independently, by the security rules.
 */
const AUDITOR_PERMISSIONS: Permission[] = [
  "donation:read",
  "expense:read",
  "fund:read",
  "event:read",
  "registration:read",
  "feedback:read",
  "report:generate",
  "audit:read",
];

const VOLUNTEER_PERMISSIONS: Permission[] = ["event:read", "registration:read"];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  FINANCE_ADMIN: FINANCE_PERMISSIONS,
  EVENT_ADMIN: EVENT_PERMISSIONS,
  CONTENT_ADMIN: CONTENT_PERMISSIONS,
  AUDITOR: AUDITOR_PERMISSIONS,
  VOLUNTEER: VOLUNTEER_PERMISSIONS,
};

export type AdminStatus = "ACTIVE" | "SUSPENDED";

export interface AdminIdentity {
  uid: string;
  role: Role;
  status: AdminStatus;
  displayName: string;
  email: string;
}

/**
 * The only permission check the application should call.
 * A suspended administrator has no permissions at all, regardless of role —
 * this mirrors the `status == 'ACTIVE'` requirement in the security rules.
 */
export function can(
  identity: Pick<AdminIdentity, "role" | "status"> | null | undefined,
  permission: Permission,
): boolean {
  if (!identity) return false;
  if (identity.status !== "ACTIVE") return false;
  const granted = ROLE_PERMISSIONS[identity.role];
  if (!granted) return false;
  return granted.includes(permission);
}

export function canAny(
  identity: Pick<AdminIdentity, "role" | "status"> | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(identity, permission));
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
