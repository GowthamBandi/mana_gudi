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
    <div className="min-h-screen bg-sandal-50 pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-4 border-marigold-500 bg-temple-900 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-base md:text-lg font-bold leading-tight">Mana Gudi Committee</p>
            <p className="text-xs text-marigold-200 truncate max-w-[200px] md:max-w-none">
              {identity.displayName} · <span className="font-semibold">{ROLE_LABELS[identity.role]}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-lg bg-temple-800 px-3 text-xs font-semibold text-white hover:bg-temple-700"
            >
              Public Site ↗
            </Link>
            <button
              onClick={() => void signOutNow()}
              className="inline-flex min-h-11 items-center rounded-lg bg-sandal-200 px-3 text-xs font-semibold text-temple-900 hover:bg-sandal-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Committee sections" className="hidden md:block border-t border-white/15">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-1">
            {visibleNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded px-3 text-sm font-medium text-white no-underline hover:bg-temple-800 ${
                    pathname === item.href ? "bg-temple-700 underline underline-offset-4 font-bold" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Main Content Area */}
      <main id="main" className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-sandal-300 bg-temple-900 text-white shadow-lg md:hidden"
      >
        <ul className="grid grid-cols-5 h-16 items-center text-center">
          <li>
            <Link
              href="/admin"
              prefetch={false}
              className={`flex flex-col items-center justify-center h-full text-[11px] font-semibold ${
                pathname === "/admin" ? "text-marigold-400 bg-temple-800" : "text-sandal-200"
              }`}
            >
              <span className="text-lg">📊</span>
              <span>Overview</span>
            </Link>
          </li>
          {can(identity, "donation:read") && (
            <li>
              <Link
                href="/admin/donations"
                prefetch={false}
                className={`flex flex-col items-center justify-center h-full text-[11px] font-semibold ${
                  pathname.startsWith("/admin/donations") ? "text-marigold-400 bg-temple-800" : "text-sandal-200"
                }`}
              >
                <span className="text-lg">🙏</span>
                <span>Donations</span>
              </Link>
            </li>
          )}
          {can(identity, "expense:read") && (
            <li>
              <Link
                href="/admin/expenses"
                prefetch={false}
                className={`flex flex-col items-center justify-center h-full text-[11px] font-semibold ${
                  pathname.startsWith("/admin/expenses") ? "text-marigold-400 bg-temple-800" : "text-sandal-200"
                }`}
              >
                <span className="text-lg">🧾</span>
                <span>Expenses</span>
              </Link>
            </li>
          )}
          {can(identity, "event:manage") && (
            <li>
              <Link
                href="/admin/events"
                prefetch={false}
                className={`flex flex-col items-center justify-center h-full text-[11px] font-semibold ${
                  pathname.startsWith("/admin/events") ? "text-marigold-400 bg-temple-800" : "text-sandal-200"
                }`}
              >
                <span className="text-lg">🪔</span>
                <span>Events</span>
              </Link>
            </li>
          )}
          {can(identity, "audit:read") && (
            <li>
              <Link
                href="/admin/audit"
                prefetch={false}
                className={`flex flex-col items-center justify-center h-full text-[11px] font-semibold ${
                  pathname.startsWith("/admin/audit") ? "text-marigold-400 bg-temple-800" : "text-sandal-200"
                }`}
              >
                <span className="text-lg">📜</span>
                <span>Audit</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
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
