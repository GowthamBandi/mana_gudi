"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { formatPaise } from "@/lib/domain/money";
import {
  publicDonations,
  publicExpenses,
  publicFunds,
  verifyDonationReceipt,
  type Page,
} from "@/lib/services/public-data";
import { toDate, type Fund, type PublicDonation, type PublicExpense } from "@/lib/services/types";
import { normaliseReference } from "@/lib/domain/ids";
import { describeError, useAsync } from "@/lib/use-async";
import { Button, Card, EmptyState, ErrorState, LoadingState, inputClass } from "./ui";

type Row = PublicDonation | PublicExpense;

function isDonation(row: Row): row is PublicDonation {
  return "receiptNo" in row;
}

/**
 * Shared register for donations and expenses.
 *
 * Paging is cursor-based rather than offset-based, because Firestore charges
 * per document read: an offset query re-reads every skipped document, so
 * page 20 of a long register would cost twenty times page 1.
 */
export function LedgerTable({ kind }: { kind: "donations" | "expenses" }) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundFilter, setFundFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    publicFunds()
      .then(setFunds)
      .catch(() => setFunds([]));
  }, []);

  return (
    <div className="mt-6">
      <LedgerFilters
        kind={kind}
        funds={funds}
        search={search}
        onSearch={setSearch}
        fundFilter={fundFilter}
        onFundFilter={setFundFilter}
      />
      {/*
        Keyed on the filter so that changing it remounts the results with fresh
        initial state. This avoids resetting state from inside an effect, which
        React 19 flags as a cascading render.
      */}
      <LedgerRows key={`${kind}:${fundFilter}`} kind={kind} fundFilter={fundFilter} search={search} />
    </div>
  );
}

function LedgerFilters({
  kind,
  funds,
  search,
  onSearch,
  fundFilter,
  onFundFilter,
}: {
  kind: "donations" | "expenses";
  funds: Fund[];
  search: string;
  onSearch: (value: string) => void;
  fundFilter: string;
  onFundFilter: (value: string) => void;
}) {
  const label = kind === "donations" ? "donations" : "expenses";
  return (
    <Card className="mb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ledger-search" className="mb-1 block font-semibold">
            Search these {label}
          </label>
          <input
            id="ledger-search"
            type="search"
            className={inputClass}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={
              kind === "donations" ? "Receipt number, name or purpose" : "Description or category"
            }
          />
        </div>
        <div>
          <label htmlFor="ledger-fund" className="mb-1 block font-semibold">
            Show one fund only
          </label>
          <select
            id="ledger-fund"
            className={inputClass}
            value={fundFilter}
            onChange={(event) => onFundFilter(event.target.value)}
          >
            <option value="">All funds</option>
            {funds.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {fund.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}

function LedgerRows({
  kind,
  fundFilter,
  search,
}: {
  kind: "donations" | "expenses";
  fundFilter: string;
  search: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageOf = useCallback(
    (from: DocumentSnapshot | null): Promise<Page<Row>> =>
      kind === "donations"
        ? publicDonations({ fundId: fundFilter || undefined }, from)
        : publicExpenses({ fundId: fundFilter || undefined }, from),
    [kind, fundFilter],
  );

  // First page. State is only touched after the await, never synchronously.
  useEffect(() => {
    let active = true;
    fetchPageOf(null)
      .then((page) => {
        if (!active) return;
        setRows(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
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
  }, [fetchPageOf]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPageOf(cursor);
      setRows((previous) => [...previous, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LedgerRowsView
      kind={kind}
      rows={rows}
      search={search}
      loading={loading}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  );
}

/**
 * Direct lookup of one receipt or voucher number.
 *
 * This is an exact-match query against the whole register, so it finds the
 * record no matter how far back it sits. It costs a single document read.
 */
function ReferenceLookup({
  reference,
  kind,
}: {
  reference: string;
  kind: "donations" | "expenses";
}) {
  const state = useAsync(
    () => (kind === "donations" ? verifyDonationReceipt(reference) : Promise.resolve(null)),
    [reference, kind],
  );

  if (kind !== "donations") return null;
  if (state.phase === "loading") return <LoadingState label={`Looking up ${reference}`} />;
  if (state.phase === "error") return null;
  if (!state.data || state.data.status !== "FOUND") {
    return (
      <div className="mb-6 rounded-xl border border-marigold-500/40 bg-marigold-100 p-4">
        <p className="font-semibold text-marigold-600">
          {reference} is not in the published register
        </p>
        <p className="mt-1 text-ink-700">
          It may not have been published yet. You can{" "}
          <Link href={`/verify?ref=${encodeURIComponent(reference)}`} prefetch={false}>check this receipt</Link> for
          more detail.
        </p>
      </div>
    );
  }

  const donation = state.data.donation;
  return (
    <div className="mb-6 rounded-xl border-2 border-verify-700 bg-white p-4">
      <p className="font-semibold text-verify-700">Found {donation.receiptNo}</p>
      <p className="mt-1">
        <span className="amount text-lg font-bold">{formatPaise(donation.amountPaise)}</span> ·{" "}
        {donation.purpose} · {donation.displayName}
      </p>
      <p className="mt-1">
        <Link href={`/verify?ref=${encodeURIComponent(donation.receiptNo)}`} prefetch={false}>
          Verify this receipt →
        </Link>
      </p>
    </div>
  );
}

import { useLanguage } from "@/lib/i18n/context";

function LedgerRowsView({
  kind,
  rows,
  search,
  loading,
  error,
  hasMore,
  onLoadMore,
}: {
  kind: "donations" | "expenses";
  rows: Row[];
  search: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useLanguage();

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = isDonation(row)
        ? [row.receiptNo, row.displayName, row.purpose, row.fundName]
        : [row.voucherNo, row.description, row.category, row.payeeDisplay, row.fundName];
      return haystack.join(" ").toLowerCase().includes(needle);
    });
  }, [rows, search]);

  const label = kind === "donations" ? t.statDonations : t.statExpenses;
  const reference = normaliseReference(search);

  return (
    <div>
      {reference ? <ReferenceLookup reference={reference} kind={kind} /> : null}

      {error ? <ErrorState message={error} /> : null}
      {loading && rows.length === 0 ? <LoadingState label={t.loadingLabel} /> : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title={
            search
              ? `No ${label.toLowerCase()} match "${search}"`
              : kind === "donations"
              ? t.emptyDonationsTitle
              : t.emptyExpensesTitle
          }
          hint={
            search
              ? "Try a shorter search, or clear the filters."
              : kind === "donations"
              ? t.emptyDonationsHint
              : t.emptyExpensesHint
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <>
          <p className="mb-2 text-sm text-ink-500" aria-live="polite">
            Showing {visible.length} {label}
          </p>
          {/*
            tabIndex/role/aria-label: on a narrow screen this region scrolls
            horizontally, and a scrollable region that cannot be focused is
            unreachable for someone navigating by keyboard.
          */}
          {/* Mobile card list on narrow viewports */}
          <div className="grid gap-3 sm:hidden">
            {visible.map((row) => {
              const when = toDate(row.occurredAt);
              const refNo = isDonation(row) ? row.receiptNo : row.voucherNo;
              const title = isDonation(row) ? row.displayName : row.description;
              const category = isDonation(row) ? row.purpose : row.category;

              return (
                <Card key={row.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-temple-800">{refNo}</span>
                    <span className="amount font-bold text-temple-900 text-base">
                      {formatPaise(row.amountPaise)}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-ink-900 text-sm">{title}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500 border-t border-sandal-100 pt-2">
                    <span>{category} · {row.fundName}</span>
                    {when && (
                      <time dateTime={when.toISOString()}>
                        {when.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </time>
                    )}
                  </div>
                  {row.corrected && (
                    <span className="mt-2 inline-block rounded bg-marigold-100 px-2 py-0.5 text-[10px] font-bold text-marigold-800">
                      Witnessed Correction Record
                    </span>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop table view on sm+ screens */}
          <div
            className="hidden sm:block overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={`Published temple ${label} table`}
          >
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <caption className="sr-only">
                Published temple {label}, most recent first
              </caption>
              <thead>
                <tr className="border-b-2 border-sandal-300">
                  <th scope="col" className="py-2 pr-4">
                    {kind === "donations" ? "Receipt" : "Voucher"}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {kind === "donations" ? "Donor" : "Description"}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    {kind === "donations" ? "Purpose" : "Category"}
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Date
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const when = toDate(row.occurredAt);
                  return (
                    <tr key={row.id} className="border-b border-sandal-200">
                      <th scope="row" className="amount py-3 pr-4 font-medium">
                        {isDonation(row) ? row.receiptNo : row.voucherNo}
                        {row.corrected ? (
                          <span className="ml-2 rounded bg-marigold-100 px-1.5 py-0.5 text-xs font-semibold text-marigold-600">
                            corrected
                          </span>
                        ) : null}
                      </th>
                      <td className="py-3 pr-4">
                        {isDonation(row) ? row.displayName : row.description}
                        <span className="block text-sm text-ink-500">{row.fundName}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {isDonation(row) ? row.purpose : row.category}
                      </td>
                      <td className="py-3 pr-4">
                        {when ? (
                          <time dateTime={when.toISOString()}>
                            {when.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </time>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="amount py-3 text-right font-semibold">
                        {formatPaise(row.amountPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="mt-6 text-center">
              {/* Being explicit that search covers only what is loaded, so an
                  absent result is never mistaken for an absent donation. */}
              {search ? (
                <p className="mb-3 text-sm text-ink-500">
                  Searching the {label} loaded so far. Load more to search further back, or type a
                  receipt number to find it directly.
                </p>
              ) : null}
              <Button
                variant="secondary"
                disabled={loading}
                onClick={onLoadMore}
              >
                {loading ? "Loading…" : `Show more ${label}`}
              </Button>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-ink-500">
              That is every published {kind === "donations" ? "donation" : "expense"}.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
