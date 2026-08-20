"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { recentAudit } from "@/lib/services/audit";
import { toDate, type AuditEntry } from "@/lib/services/types";
import { describeError } from "@/lib/use-async";
import { EmptyState, ErrorState, LoadingState, inputClass } from "@/components/ui";
import { RequirePermission } from "@/components/admin/chrome";

export default function AdminAuditPage() {
  return (
    <RequirePermission permission="audit:read">
      <AuditWorkspace />
    </RequirePermission>
  );
}

function AuditWorkspace() {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recentAudit(100);
      setEntries(data);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    recentAudit(100)
      .then((data) => {
        if (!active) return;
        setEntries(data);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(describeError(caught));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!identity) return <LoadingState />;

  const filtered = entries.filter((e) => {
    if (resourceFilter !== "ALL" && e.resourceType !== resourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSummary = e.summary?.toLowerCase().includes(q);
      const matchActor = e.actorName?.toLowerCase().includes(q);
      const matchAction = e.action?.toLowerCase().includes(q);
      const matchId = e.resourceId?.toLowerCase().includes(q);
      return matchSummary || matchActor || matchAction || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-temple-800">Immutable Audit Log</h1>
        <p className="mt-1 text-ink-700">
          Append-only record of every financial, event, and administrative action. Audit records
          are self-attesting and cannot be edited or erased by any administrator.
        </p>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sandal-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <label htmlFor="resource-filter" className="text-sm font-semibold text-ink-700">
            Filter resource:
          </label>
          <select
            id="resource-filter"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className={inputClass}
          >
            <option value="ALL">All resources</option>
            <option value="donation">Donations</option>
            <option value="expense">Expenses</option>
            <option value="event">Events</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search actor, action or ref ID..."
          className={`${inputClass} w-full sm:w-64`}
        />
      </div>

      {loading ? <LoadingState label="Loading audit logs" /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="No matching audit entries"
          hint="Try adjusting your filter or search query."
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="rounded-xl border border-sandal-200 bg-white overflow-hidden shadow-sm">
          <ul className="divide-y divide-sandal-200">
            {filtered.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const timestamp = toDate(entry.at);
              return (
                <li key={entry.id} className="p-4 hover:bg-sandal-50/50 transition-colors">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-temple-100 px-2 py-0.5 text-xs font-bold text-temple-800">
                        {entry.action}
                      </span>
                      <span className="font-semibold text-ink-900">{entry.summary || entry.action}</span>
                    </div>
                    <span className="text-xs text-ink-500 font-mono">
                      {timestamp?.toLocaleString("en-IN") ?? "Timestamp pending"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center justify-between text-sm text-ink-600 gap-2">
                    <span>
                      Actor: <strong>{entry.actorName || entry.actorUid}</strong> ({entry.actorRole})
                    </span>
                    {(entry.before || entry.after || entry.reason) ? (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="text-xs font-semibold text-temple-700 hover:underline"
                      >
                        {isExpanded ? "Hide details ▲" : "View details ▼"}
                      </button>
                    ) : null}
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 space-y-2 rounded-lg bg-sandal-100 p-3 text-xs font-mono text-ink-800">
                      {entry.reason ? (
                        <p className="font-sans font-semibold text-ink-900 text-sm">
                          Reason: {entry.reason}
                        </p>
                      ) : null}
                      {entry.before ? (
                        <div>
                          <span className="font-bold text-alert-700">BEFORE:</span>
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 border border-sandal-200">
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      {entry.after ? (
                        <div>
                          <span className="font-bold text-verify-700">AFTER:</span>
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 border border-sandal-200">
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
