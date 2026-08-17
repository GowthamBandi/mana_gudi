"use client";

import Link from "next/link";
import { useAdminSession } from "@/lib/auth/admin-session";
import { can } from "@/lib/domain/rbac";
import { formatPaise } from "@/lib/domain/money";
import { listDonations } from "@/lib/services/donations";
import { recentAudit } from "@/lib/services/audit";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState, StatusPill } from "@/components/ui";

export default function AdminOverviewPage() {
  const { state } = useAdminSession();
  const identity = state.phase === "ready" ? state.identity : null;

  return (
    <>
      <h1 className="text-2xl font-bold text-temple-800">Overview</h1>
      <p className="mt-1 text-ink-700">
        What needs your attention today. You only see the sections your role covers.
      </p>

      <div className="mt-6 space-y-8">
        {identity && can(identity, "donation:verify") ? <PendingVerification /> : null}
        {identity && can(identity, "audit:read") ? <RecentActivity /> : null}
        {identity && !can(identity, "donation:read") && !can(identity, "audit:read") ? (
          <Card>
            <h2 className="text-lg font-semibold">Nothing pending</h2>
            <p className="mt-1 text-ink-700">
              Your role does not include financial approvals. Use the menu above to reach your
              areas.
            </p>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function PendingVerification() {
  const state = useAsync(() => listDonations("SUBMITTED", { pageSize: 10 }), []);
  const { state: session } = useAdminSession();
  const uid = session.phase === "ready" ? session.identity.uid : "";

  return (
    <section aria-labelledby="pending">
      <h2 id="pending" className="mb-3 text-xl font-semibold text-temple-800">
        Donations awaiting a second signature
      </h2>

      {state.phase === "loading" ? <LoadingState label="Loading" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.items.length === 0 ? (
        <EmptyState
          title="Nothing is waiting for verification"
          hint="Records submitted by other committee members will appear here."
        />
      ) : null}
      {state.phase === "ready" && state.data.items.length > 0 ? (
        <ul className="space-y-3">
          {state.data.items.map((donation) => {
            const isOwn = donation.createdBy === uid;
            return (
              <li key={donation.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="amount font-semibold text-temple-800">{donation.receiptNo}</p>
                    <StatusPill status={donation.status} />
                  </div>
                  <p className="mt-1">
                    <span className="amount text-lg font-bold">
                      {formatPaise(donation.amountPaise)}
                    </span>{" "}
                    · {donation.purpose}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    Recorded {toDate(donation.createdAt)?.toLocaleString("en-IN") ?? "recently"}
                  </p>
                  {isOwn ? (
                    <p className="mt-2 rounded-lg bg-marigold-100 p-2 text-sm text-marigold-600">
                      You recorded this one, so somebody else must verify it.
                    </p>
                  ) : (
                    <p className="mt-2">
                      <Link href="/admin/donations">Review and verify →</Link>
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function RecentActivity() {
  const state = useAsync(() => recentAudit(15), []);

  return (
    <section aria-labelledby="activity">
      <h2 id="activity" className="mb-3 text-xl font-semibold text-temple-800">
        Recent committee activity
      </h2>
      {state.phase === "loading" ? <LoadingState label="Loading activity" /> : null}
      {state.phase === "error" ? <ErrorState message={state.message} onRetry={state.reload} /> : null}
      {state.phase === "ready" && state.data.length === 0 ? (
        <EmptyState title="No activity recorded yet" />
      ) : null}
      {state.phase === "ready" && state.data.length > 0 ? (
        <ul className="divide-y divide-sandal-200 rounded-xl border border-sandal-200 bg-white">
          {state.data.map((entry) => (
            <li key={entry.id} className="p-3">
              <p className="font-medium">{entry.summary || entry.action}</p>
              <p className="text-sm text-ink-500">
                {entry.actorName || entry.actorUid} ·{" "}
                {toDate(entry.at)?.toLocaleString("en-IN") ?? ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
