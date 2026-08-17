"use client";

import Link from "next/link";
import { formatPaiseCompact } from "@/lib/domain/money";
import { EVENT_TYPE_LABELS } from "@/lib/services/types";
import { publicStats, upcomingEvents } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "./ui";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  // The hint lives inside the <dd>, not beside it: a <dl> may only contain
  // <dt>/<dd> groups, and a stray <p> breaks how screen readers pair the
  // term with its value.
  return (
    <Card className="text-center">
      <dt className="text-sm font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-1">
        <span className="amount block text-3xl font-bold text-temple-800">{value}</span>
        {hint ? <span className="mt-1 block text-sm text-ink-500">{hint}</span> : null}
      </dd>
    </Card>
  );
}

export function HomeDashboard() {
  const state = useAsync(() => publicStats("all-time"), []);

  return (
    <section className="mb-10" aria-labelledby="accounts-summary">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="accounts-summary" className="text-2xl font-semibold text-temple-800">
          Temple accounts at a glance
        </h2>
        <Link href="/transparency">See the full accounts</Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading temple accounts" /> : null}
      {state.phase === "error" ? (
        <ErrorState message={state.message} onRetry={state.reload} />
      ) : null}
      {state.phase === "ready" && !state.data ? (
        <EmptyState
          title="The accounts have not been published yet"
          hint="Once the committee publishes the first records, the totals will appear here."
        />
      ) : null}
      {state.phase === "ready" && state.data ? (
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label="Donations received"
            value={formatPaiseCompact(state.data.totalDonationsPaise)}
            hint={`${state.data.donationCount} receipts`}
          />
          <StatTile
            label="Money spent"
            value={formatPaiseCompact(state.data.totalExpensesPaise)}
            hint={`${state.data.expenseCount} vouchers`}
          />
          <StatTile
            label="Balance held"
            value={formatPaiseCompact(state.data.balancePaise)}
            hint="Across all funds"
          />
          <StatTile label="Records published" value="Every one" hint="Nothing is hidden" />
        </dl>
      ) : null}
    </section>
  );
}

export function HomeEvents() {
  const state = useAsync(() => upcomingEvents(4), []);

  return (
    <section className="mb-10" aria-labelledby="upcoming">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="upcoming" className="text-2xl font-semibold text-temple-800">
          Upcoming poojas, homams and festivals
        </h2>
        <Link href="/events">All events</Link>
      </div>

      {state.phase === "loading" ? <LoadingState label="Loading events" /> : null}
      {state.phase === "error" ? (
        <ErrorState message={state.message} onRetry={state.reload} />
      ) : null}
      {state.phase === "ready" && state.data.length === 0 ? (
        <EmptyState
          title="No events are scheduled just now"
          hint="Festival and pooja dates are published here as soon as the committee fixes them."
        />
      ) : null}
      {state.phase === "ready" && state.data.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.data.map((event) => {
            const start = toDate(event.startAt);
            return (
              <li key={event.id}>
                <Card>
                  <p className="text-sm font-semibold uppercase tracking-wide text-marigold-600">
                    {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-temple-800">
                    <Link href={`/events?id=${event.id}`}>{event.title}</Link>
                  </h3>
                  {start ? (
                    <p className="mt-1 text-ink-700">
                      <time dateTime={start.toISOString()}>
                        {start.toLocaleDateString("en-IN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {" · "}
                        {start.toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-ink-700">{event.description}</p>
                  {event.registrationRequired ? (
                    <p className="mt-2 text-sm font-semibold text-verify-700">
                      Registration required
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
