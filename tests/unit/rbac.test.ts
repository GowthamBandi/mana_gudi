import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  can,
  canAny,
  isRole,
  type Permission,
  type Role,
} from "@/lib/domain/rbac";

function actor(role: Role, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
  return { role, status };
}

describe("permission matrix", () => {
  it("gives the super admin every permission", () => {
    for (const permission of PERMISSIONS) {
      expect(can(actor("SUPER_ADMIN"), permission), permission).toBe(true);
    }
  });

  it("keeps the auditor strictly read-only", () => {
    const writePermissions = PERMISSIONS.filter(
      (p) =>
        p.includes(":create") ||
        p.includes(":manage") ||
        p.includes(":verify") ||
        p.includes(":publish") ||
        p.includes(":correct") ||
        p.includes(":submit") ||
        p.includes(":count"),
    );
    for (const permission of writePermissions) {
      expect(can(actor("AUDITOR"), permission), permission).toBe(false);
    }
    expect(can(actor("AUDITOR"), "audit:read")).toBe(true);
    expect(can(actor("AUDITOR"), "donation:read")).toBe(true);
  });

  it("keeps roles inside their own domain", () => {
    expect(can(actor("EVENT_ADMIN"), "donation:create")).toBe(false);
    expect(can(actor("EVENT_ADMIN"), "expense:verify")).toBe(false);
    expect(can(actor("CONTENT_ADMIN"), "donation:read")).toBe(false);
    expect(can(actor("FINANCE_ADMIN"), "event:manage")).toBe(false);
    expect(can(actor("FINANCE_ADMIN"), "content:manage")).toBe(false);
    expect(can(actor("VOLUNTEER"), "registration:manage")).toBe(false);
  });

  it("reserves administrator management for the super admin alone", () => {
    for (const role of ROLES) {
      const expected = role === "SUPER_ADMIN";
      expect(can(actor(role), "admin:manage"), role).toBe(expected);
      expect(can(actor(role), "config:manage"), role).toBe(expected);
    }
  });

  it("reserves audit reading for super admin and auditor", () => {
    expect(can(actor("SUPER_ADMIN"), "audit:read")).toBe(true);
    expect(can(actor("AUDITOR"), "audit:read")).toBe(true);
    expect(can(actor("FINANCE_ADMIN"), "audit:read")).toBe(false);
    expect(can(actor("EVENT_ADMIN"), "audit:read")).toBe(false);
  });
});

describe("suspension and absence", () => {
  it("removes every permission from a suspended admin", () => {
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(can(actor(role, "SUSPENDED"), permission), `${role}/${permission}`).toBe(false);
      }
    }
  });

  it("denies an absent identity", () => {
    expect(can(null, "donation:read")).toBe(false);
    expect(can(undefined, "donation:read")).toBe(false);
  });

  it("denies a forged role that is not in the matrix", () => {
    const forged = { role: "GOD_MODE" as Role, status: "ACTIVE" as const };
    expect(can(forged, "admin:manage")).toBe(false);
    expect(isRole("GOD_MODE")).toBe(false);
    expect(isRole("SUPER_ADMIN")).toBe(true);
  });
});

describe("canAny", () => {
  it("is true when at least one permission is held", () => {
    expect(canAny(actor("EVENT_ADMIN"), ["donation:create", "event:manage"])).toBe(true);
  });

  it("is false when none are held", () => {
    expect(canAny(actor("VOLUNTEER"), ["donation:create", "admin:manage"])).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(canAny(actor("SUPER_ADMIN"), [] as Permission[])).toBe(false);
  });
});
