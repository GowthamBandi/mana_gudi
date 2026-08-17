"use client";

import { formatPaise } from "@/lib/domain/money";
import { publicCorrections } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "./ui";

export function CorrectionsRegister() {
  const state = useAsync(() => publicCorrections(100), []);

  if (state.phase === "loading") return <LoadingState label="Loading the corrections register" />;
  if (state.phase === "error")
    return (
      <div className="mt-6">
        <ErrorState message={state.message} onRetry={state.reload} />
      </div>
    );

  if (state.data.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No published figure has ever been changed"
          hint="If a correction is ever made, it will appear here automatically and permanently."
        />
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-4">
      {state.data.map((correction) => {
        const at = toDate(correction.correctedAt);
        const increased = correction.toAmountPaise > correction.fromAmountPaise;
        return (
          <li key={correction.id}>
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="amount text-lg font-semibold text-temple-800">
                  {correction.publicRef}
                </h2>
                <p className="text-sm text-ink-500">
                  {correction.recordType === "donation" ? "Donation" : "Expense"} · revision{" "}
                  {correction.revisionNumber}
                  {at ? (
                    <>
                      {" · "}
                      <time dateTime={at.toISOString()}>
                        {at.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </time>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-alert-100 px-3 py-1">
                  <span className="block text-xs font-semibold uppercase text-ink-500">
                    Was recorded as
                  </span>
                  <span className="amount font-bold line-through">
                    {formatPaise(correction.fromAmountPaise)}
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl text-ink-500">
                  →
                </span>
                <span className="rounded-lg bg-verify-100 px-3 py-1">
                  <span className="block text-xs font-semibold uppercase text-ink-500">
                    Corrected to
                  </span>
                  <span className="amount font-bold text-verify-700">
                    {formatPaise(correction.toAmountPaise)}
                  </span>
                </span>
                <span className="text-sm text-ink-500">
                  ({increased ? "increased" : "reduced"} by{" "}
                  {formatPaise(Math.abs(correction.toAmountPaise - correction.fromAmountPaise))})
                </span>
              </div>

              <p className="mt-3">
                <span className="font-semibold">Reason given: </span>
                {correction.reason}
              </p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
