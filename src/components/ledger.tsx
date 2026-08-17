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
          <Link href={`/verify?ref=${encodeURIComponent(reference)}`}>check this receipt</Link> for
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
        <Link href={`/verify?ref=${encodeURIComponent(donation.receiptNo)}`}>
          Verify this receipt →
        </Link>
      </p>
    </div>
  );
}

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

  /**
   * Text search runs over the rows already fetched. It filters only fields that
   * are public by construction, so it cannot surface a donor's phone number
   * even if one somehow reached the projection.
   */
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

  const label = kind === "donations" ? "donations" : "expenses";

  const reference = normaliseReference(search);

  return (
    <div>
      {/*
        Searching by receipt number must work even when that receipt is far down
        the register. Client-side filtering alone would tell a devotee their
        donation "does not exist" simply because it had not been paged in yet —
        precisely the doubt this site exists to remove.
      */}
      {reference ? <ReferenceLookup reference={reference} kind={kind} /> : null}

      {error ? <ErrorState message={error} /> : null}
      {loading && rows.length === 0 ? <LoadingState label={`Loading ${label}`} /> : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title={search ? `No ${label} match "${search}"` : `No ${label} published yet`}
          hint={
            search
              ? "Try a shorter search, or clear the filters."
              : "Records appear here once the committee has verified and published them."
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
          <div
            className="overflow-x-auto"
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
