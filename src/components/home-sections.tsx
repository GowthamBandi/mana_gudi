"use client";

import Link from "next/link";
import { formatPaiseCompact } from "@/lib/domain/money";
import { EVENT_TYPE_LABELS } from "@/lib/services/types";
import { publicStats, upcomingEvents } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "./ui";

import { useLanguage } from "@/lib/i18n/context";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="text-center p-3 sm:p-5">
      <dt className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-1">
        <span className="amount block text-xl sm:text-3xl font-bold text-temple-800 break-words">{value}</span>
        {hint ? <span className="mt-1 block text-xs sm:text-sm text-ink-500">{hint}</span> : null}
      </dd>
    </Card>
  );
}

export function HomeDashboard() {
  const state = useAsync(() => publicStats("all-time"), []);
  const { t } = useLanguage();

  return (
    <section className="mb-10" aria-labelledby="accounts-summary">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="accounts-summary" className="text-xl sm:text-2xl font-semibold text-temple-800">
          {t.homeAccountsHeading}
        </h2>
        <Link href="/transparency" prefetch={false}>{t.btnSeeFullAccounts}</Link>
      </div>

      {state.phase === "loading" ? <LoadingState label={t.loadingLabel} /> : null}
      {state.phase === "error" ? (
        <ErrorState message={state.message} onRetry={state.reload} />
      ) : null}
      {state.phase === "ready" && (!state.data || (state.data.donationCount === 0 && state.data.expenseCount === 0)) ? (
        <EmptyState
          title={t.emptyAccountsTitle}
          hint={t.emptyAccountsHint}
        />
      ) : null}
      {state.phase === "ready" && state.data && (state.data.donationCount > 0 || state.data.expenseCount > 0) ? (
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <StatTile
            label={t.statDonations}
            value={formatPaiseCompact(state.data.totalDonationsPaise)}
            hint={`${state.data.donationCount} ${t.statReceiptsCount}`}
          />
          <StatTile
            label={t.statExpenses}
            value={formatPaiseCompact(state.data.totalExpensesPaise)}
            hint={`${state.data.expenseCount} ${t.statVouchersCount}`}
          />
          <StatTile
            label={t.statBalance}
            value={formatPaiseCompact(state.data.balancePaise)}
            hint={t.statAllFunds}
          />
          <StatTile label={t.statRecords} value={t.statNothingHidden} />
        </dl>
      ) : null}
    </section>
  );
}

export function HomeEvents() {
  const state = useAsync(() => upcomingEvents(4), []);
  const { t } = useLanguage();

  return (
    <section className="mb-10" aria-labelledby="upcoming">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="upcoming" className="text-2xl font-semibold text-temple-800">
          {t.homeEventsHeading}
        </h2>
        <Link href="/events" prefetch={false}>{t.btnAllEvents}</Link>
      </div>

      {state.phase === "loading" ? <LoadingState label={t.loadingLabel} /> : null}
      {state.phase === "error" ? (
        <ErrorState message={state.message} onRetry={state.reload} />
      ) : null}
      {state.phase === "ready" && state.data.length === 0 ? (
        <EmptyState
          title={t.emptyEventsTitle}
          hint={t.emptyEventsHint}
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
                    <Link href={`/events?id=${event.id}`} prefetch={false}>{event.title}</Link>
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
                      {t.eventRegistrationRequired}
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
