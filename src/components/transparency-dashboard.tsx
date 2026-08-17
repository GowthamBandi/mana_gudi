"use client";

import Link from "next/link";
import { formatPaise, formatPaiseCompact } from "@/lib/domain/money";
import { publicCorrections, publicFunds, publicStats } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Amount, Card, EmptyState, ErrorState, LoadingState, SectionHeading } from "./ui";

/**
 * A horizontal bar comparison, drawn with plain elements rather than a chart
 * library. At this data density a bar chart's only job is to make relative size
 * obvious, and every value is also printed as a number so the picture is never
 * the only way to read the information.
 */
function BreakdownBars({
  title,
  data,
  emptyHint,
}: {
  title: string;
  data: Record<string, number>;
  emptyHint: string;
}) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 0;

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-temple-700">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-ink-500">{emptyHint}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([label, value]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-ink-900">{label}</span>
                <Amount paise={value} className="text-ink-700" />
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-sandal-200"
                role="img"
                aria-label={`${label}: ${formatPaise(value)}`}
              >
                <div
                  className="h-full rounded-full bg-marigold-500"
                  style={{ width: max > 0 ? `${Math.max(3, (value / max) * 100)}%` : "0%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TransparencyDashboard() {
  const stats = useAsync(() => publicStats("all-time"), []);
  const funds = useAsync(() => publicFunds(), []);
  const corrections = useAsync(() => publicCorrections(5), []);

  return (
    <div className="mt-8 space-y-10">
      <section aria-labelledby="totals">
        <SectionHeading title="The headline numbers" />
        <h2 id="totals" className="sr-only">
          Totals
        </h2>

        {stats.phase === "loading" ? <LoadingState label="Loading totals" /> : null}
        {stats.phase === "error" ? (
          <ErrorState message={stats.message} onRetry={stats.reload} />
        ) : null}
        {stats.phase === "ready" && !stats.data ? (
          <EmptyState
            title="No accounts have been published yet"
            hint="Figures appear here as soon as the committee publishes verified records."
          />
        ) : null}
        {stats.phase === "ready" && stats.data ? (
          <>
            {/* Hints sit inside each <dd>; a <dl> may only contain dt/dd groups. */}
            <dl className="grid gap-4 sm:grid-cols-3">
              <Card>
                <dt className="font-semibold text-ink-500">Total donations received</dt>
                <dd className="mt-1">
                  <span className="amount block text-3xl font-bold text-verify-700">
                    {formatPaise(stats.data.totalDonationsPaise)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-500">
                    from {stats.data.donationCount} published receipts
                  </span>
                </dd>
              </Card>
              <Card>
                <dt className="font-semibold text-ink-500">Total money spent</dt>
                <dd className="mt-1">
                  <span className="amount block text-3xl font-bold text-temple-700">
                    {formatPaise(stats.data.totalExpensesPaise)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-500">
                    across {stats.data.expenseCount} published vouchers
                  </span>
                </dd>
              </Card>
              <Card>
                <dt className="font-semibold text-ink-500">Balance held by the temple</dt>
                <dd className="mt-1">
                  <span className="amount block text-3xl font-bold text-temple-800">
                    {formatPaise(stats.data.balancePaise)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-500">
                    donations received minus money spent
                  </span>
                </dd>
              </Card>
            </dl>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BreakdownBars
                title="What donations were given for"
                data={stats.data.byPurpose}
                emptyHint="No donations published yet."
              />
              <BreakdownBars
                title="What money was spent on"
                data={stats.data.byCategory}
                emptyHint="No expenses published yet."
              />
            </div>
          </>
        ) : null}
      </section>

      <section aria-labelledby="funds">
        <h2 id="funds" className="mb-5 text-2xl font-semibold text-temple-800">
          Temple funds
        </h2>
        <p className="mb-4 max-w-3xl text-ink-700">
          Money given for a specific purpose is kept in its own fund and may only be spent on that
          purpose.
        </p>

        {funds.phase === "loading" ? <LoadingState label="Loading funds" /> : null}
        {funds.phase === "error" ? (
          <ErrorState message={funds.message} onRetry={funds.reload} />
        ) : null}
        {funds.phase === "ready" && funds.data.length === 0 ? (
          <EmptyState title="No funds have been set up yet" />
        ) : null}
        {/* The table below is focusable because it scrolls sideways on a phone. */}
        {funds.phase === "ready" && funds.data.length > 0 ? (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Temple fund balances table"
          >
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">Balance of each temple fund</caption>
              <thead>
                <tr className="border-b-2 border-sandal-300">
                  <th scope="col" className="py-2 pr-4">
                    Fund
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    Received
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    Spent
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {funds.data.map((fund) => (
                  <tr key={fund.id} className="border-b border-sandal-200">
                    <th scope="row" className="py-3 pr-4 font-medium">
                      {fund.name}
                      {fund.restricted ? (
                        <span className="ml-2 rounded bg-marigold-100 px-2 py-0.5 text-xs font-semibold text-marigold-600">
                          restricted use
                        </span>
                      ) : null}
                      <span className="block text-sm font-normal text-ink-500">
                        {fund.description}
                      </span>
                    </th>
                    <td className="py-3 pr-4 text-right">
                      <Amount paise={fund.totalInPaise} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Amount paise={fund.totalOutPaise} />
                    </td>
                    <td className="py-3 text-right">
                      <Amount paise={fund.balancePaise} className="text-temple-800" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="records">
        <h2 id="records" className="mb-5 text-2xl font-semibold text-temple-800">
          Look at the records yourself
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <h3 className="text-lg font-semibold text-temple-700">Every donation</h3>
            <p className="mt-1 text-ink-700">
              Search and filter every published donation by purpose or fund.
            </p>
            <p className="mt-3">
              <Link href="/transparency/donations">Open the donation register</Link>
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-temple-700">Every expense</h3>
            <p className="mt-1 text-ink-700">
              See what was bought or paid for, from which fund, and when.
            </p>
            <p className="mt-3">
              <Link href="/transparency/expenses">Open the expense register</Link>
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-temple-700">Check a receipt</h3>
            <p className="mt-1 text-ink-700">
              Type a receipt number to confirm the donation is really in the accounts.
            </p>
            <p className="mt-3">
              <Link href="/verify">Verify a receipt</Link>
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="corrections">
        <h2 id="corrections" className="mb-3 text-2xl font-semibold text-temple-800">
          Corrections register
        </h2>
        <p className="mb-4 max-w-3xl text-ink-700">
          Mistakes happen. When a published figure is changed, the change is recorded here forever,
          showing the old amount, the new amount and the reason. This register cannot be edited or
          deleted by anyone, including the temple administrators.
        </p>

        {corrections.phase === "loading" ? <LoadingState label="Loading corrections" /> : null}
        {corrections.phase === "error" ? (
          <ErrorState message={corrections.message} onRetry={corrections.reload} />
        ) : null}
        {corrections.phase === "ready" && corrections.data.length === 0 ? (
          <EmptyState
            title="No published figure has ever been changed"
            hint="If one is, it will be listed here automatically."
          />
        ) : null}
        {corrections.phase === "ready" && corrections.data.length > 0 ? (
          <>
            <ul className="space-y-3">
              {corrections.data.map((correction) => {
                const at = toDate(correction.correctedAt);
                return (
                  <li key={correction.id}>
                    <Card>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-temple-800">{correction.publicRef}</p>
                        {at ? (
                          <time dateTime={at.toISOString()} className="text-sm text-ink-500">
                            {at.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </time>
                        ) : null}
                      </div>
                      <p className="mt-1 text-ink-900">
                        Changed from{" "}
                        <span className="amount font-semibold line-through">
                          {formatPaise(correction.fromAmountPaise)}
                        </span>{" "}
                        to{" "}
                        <span className="amount font-semibold text-verify-700">
                          {formatPaise(correction.toAmountPaise)}
                        </span>
                      </p>
                      <p className="mt-1 text-ink-700">Reason: {correction.reason}</p>
                    </Card>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4">
              <Link href="/transparency/corrections">See the full corrections register</Link>
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}

export { formatPaiseCompact };
