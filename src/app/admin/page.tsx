"use client";

import Link from "next/link";
import { useAdminSession } from "@/lib/auth/admin-session";
import { can } from "@/lib/domain/rbac";
import { formatPaise } from "@/lib/domain/money";
import { listDonations } from "@/lib/services/donations";
import { listExpenses } from "@/lib/services/expenses";
import { listAdminEvents } from "@/lib/services/events";
import { recentAudit } from "@/lib/services/audit";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";

export default function AdminOverviewPage() {
  const { state } = useAdminSession();
  const identity = state.phase === "ready" ? state.identity : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-800">Temple Dashboard</h1>
          <p className="mt-1 text-ink-700">
            Real-time operational summary of temple donations, expenditures, events, and committee activity.
          </p>
        </div>
        {identity && (
          <div className="flex flex-wrap gap-2">
            {can(identity, "donation:create") && (
              <Link
                href="/admin/donations"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-temple-800 px-4 text-xs font-bold text-white shadow-sm hover:bg-temple-900"
              >
                <span>🙏</span> + Record Donation
              </Link>
            )}
            {can(identity, "expense:create") && (
              <Link
                href="/admin/expenses"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-marigold-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-marigold-700"
              >
                <span>🧾</span> + Record Expense
              </Link>
            )}
            {can(identity, "event:manage") && (
              <Link
                href="/admin/events"
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-sandal-200 px-4 text-xs font-bold text-temple-900 shadow-sm hover:bg-sandal-300"
              >
                <span>🪔</span> + Create Event
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {identity && can(identity, "donation:read") ? <RecentDonationsPanel /> : null}
        {identity && can(identity, "expense:read") ? <RecentExpensesPanel /> : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {identity && can(identity, "event:manage") ? <UpcomingEventsPanel /> : null}
        {identity && can(identity, "audit:read") ? <RecentActivityPanel /> : null}
      </div>
    </div>
  );
}

function RecentDonationsPanel() {
  const state = useAsync(() => listDonations("PUBLISHED", { pageSize: 5 }), []);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-sandal-200 pb-3">
        <h2 className="text-lg font-bold text-temple-800">Recent Donations</h2>
        <Link href="/admin/donations" className="text-xs font-semibold text-temple-700 hover:underline">
          View all →
        </Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading donations" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.items.length === 0 ? (
        <EmptyState
          title="₹0 recorded recently"
          description="When donations are recorded, they will appear here immediately."
        />
      ) : null}
      {state.phase === "ready" && state.data.items.length > 0 ? (
        <ul className="divide-y divide-sandal-100 mt-2">
          {state.data.items.map((donation) => (
            <li key={donation.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-ink-900">{donation.donorName}</p>
                <p className="text-xs text-ink-500">{donation.purpose} · {donation.receiptNo}</p>
              </div>
              <span className="font-bold text-temple-900">{formatPaise(donation.amountPaise)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function RecentExpensesPanel() {
  const state = useAsync(() => listExpenses("PUBLISHED", { pageSize: 5 }), []);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-sandal-200 pb-3">
        <h2 className="text-lg font-bold text-temple-800">Recent Expenses</h2>
        <Link href="/admin/expenses" className="text-xs font-semibold text-temple-700 hover:underline">
          View all →
        </Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading expenses" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.items.length === 0 ? (
        <EmptyState
          title="No expenses recorded recently"
          description="Temple expenditure vouchers will appear here when recorded."
        />
      ) : null}
      {state.phase === "ready" && state.data.items.length > 0 ? (
        <ul className="divide-y divide-sandal-100 mt-2">
          {state.data.items.map((expense) => (
            <li key={expense.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-ink-900">{expense.description}</p>
                <p className="text-xs text-ink-500">{expense.category} · {expense.payeeDisplay}</p>
              </div>
              <span className="font-bold text-temple-900">{formatPaise(expense.amountPaise)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function UpcomingEventsPanel() {
  const state = useAsync(() => listAdminEvents(), []);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-sandal-200 pb-3">
        <h2 className="text-lg font-bold text-temple-800">Temple Events</h2>
        <Link href="/admin/events" className="text-xs font-semibold text-temple-700 hover:underline">
          Manage events →
        </Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading events" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.length === 0 ? (
        <EmptyState title="No upcoming events" description="Create an event to notify devotees." />
      ) : null}
      {state.phase === "ready" && state.data.length > 0 ? (
        <ul className="divide-y divide-sandal-100 mt-2">
          {state.data.slice(0, 5).map((event) => (
            <li key={event.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-ink-900">{event.title}</p>
                <p className="text-xs text-ink-500">{event.location} · {event.eventType}</p>
              </div>
              <span className="rounded bg-marigold-100 px-2 py-0.5 text-xs font-bold text-marigold-800">
                {event.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function RecentActivityPanel() {
  const state = useAsync(() => recentAudit(5), []);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-sandal-200 pb-3">
        <h2 className="text-lg font-bold text-temple-800">Recent Audit Log</h2>
        <Link href="/admin/audit" className="text-xs font-semibold text-temple-700 hover:underline">
          Full audit log →
        </Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading activity" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.length === 0 ? (
        <EmptyState title="No activity recorded yet" />
      ) : null}
      {state.phase === "ready" && state.data.length > 0 ? (
        <ul className="divide-y divide-sandal-100 mt-2">
          {state.data.map((entry) => (
            <li key={entry.id} className="py-2.5 text-xs">
              <p className="font-semibold text-ink-900">{entry.summary || entry.action}</p>
              <p className="text-ink-500">
                {entry.actorName || entry.actorUid} ({entry.actorRole}) ·{" "}
                {toDate(entry.at)?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ?? ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
