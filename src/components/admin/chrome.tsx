"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { ROLE_LABELS, can, type Permission } from "@/lib/domain/rbac";
import { Button, Card, LoadingState } from "@/components/ui";

/**
 * `permission: null` means every active administrator sees the link. The
 * Overview page renders only the panels a given role may read, so gating the
 * link itself behind a permission would leave some roles — the treasurer, who
 * holds no event permissions — with no landing page at all.
 */
const NAV: Array<{ href: string; label: string; permission: Permission | null }> = [
  { href: "/admin", label: "Overview", permission: null },
  { href: "/admin/donations", label: "Donations", permission: "donation:read" },
  { href: "/admin/expenses", label: "Expenses", permission: "expense:read" },
  { href: "/admin/events", label: "Events", permission: "event:manage" },
  { href: "/admin/audit", label: "Audit log", permission: "audit:read" },
  { href: "/admin/administrators", label: "Administrators", permission: "admin:manage" },
];

export function AdminChrome({ children }: { children: ReactNode }) {
  const { state, signOutNow } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  // Route protection is a convenience, not a security control: the data itself
  // is protected by the security rules, so a user who forces their way to an
  // admin URL simply sees empty, permission-denied panels.
  useEffect(() => {
    if (!isLoginPage && state.phase === "signed-out") {
      router.replace("/admin/login");
    }
  }, [isLoginPage, state.phase, router]);

  if (isLoginPage) return <main id="main">{children}</main>;

  if (state.phase === "loading") {
    return (
      <main id="main" className="p-8">
        <LoadingState label="Checking your access" />
      </main>
    );
  }

  if (state.phase === "signed-out") {
    return (
      <main id="main" className="p-8">
        <LoadingState label="Redirecting to sign in" />
      </main>
    );
  }

  if (state.phase === "not-an-admin") {
    return (
      <main id="main" className="mx-auto max-w-xl p-8">
        <Card>
          <h1 className="text-2xl font-bold text-alert-700">No committee access</h1>
          <p className="mt-2 text-ink-700">
            You are signed in as <strong>{state.email}</strong>, but this account has not been
            given committee access. Ask the head of the temple committee to add you.
          </p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void signOutNow()}>
              Sign out
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (state.phase === "suspended") {
    return (
      <main id="main" className="mx-auto max-w-xl p-8">
        <Card>
          <h1 className="text-2xl font-bold text-alert-700">Your access is suspended</h1>
          <p className="mt-2 text-ink-700">
            The account <strong>{state.identity.email}</strong> has been suspended and cannot make
            any changes. Contact the head of the committee.
          </p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void signOutNow()}>
              Sign out
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const identity = state.identity;
  const visibleNav = NAV.filter(
    (item) => item.permission === null || can(identity, item.permission),
  );

  return (
    <div className="min-h-screen bg-sandal-50">
      <header className="border-b-4 border-marigold-500 bg-temple-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-lg font-bold">Committee portal</p>
            <p className="text-sm text-marigold-100">
              {identity.displayName} · {ROLE_LABELS[identity.role]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white">
              View public site
            </Link>
            <Button variant="secondary" onClick={() => void signOutNow()}>
              Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Committee sections" className="border-t border-white/15">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-1">
            {visibleNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded px-3 font-medium text-white no-underline hover:bg-temple-800 ${
                    pathname === item.href ? "bg-temple-700 underline underline-offset-4" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}

/** Wraps a panel that only certain roles may see. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { state } = useAdminSession();
  if (state.phase !== "ready") return null;
  if (!can(state.identity, permission)) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Not available to your role</h2>
        <p className="mt-1 text-ink-700">
          Your role ({ROLE_LABELS[state.identity.role]}) does not include this area. This is
          enforced by the database as well as by this screen.
        </p>
      </Card>
    );
  }
  return <>{children}</>;
}
