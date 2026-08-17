"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPaise } from "@/lib/domain/money";
import { verifyDonationReceipt, type VerificationResult } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { describeError } from "@/lib/use-async";
import { Button, Card, Field, inputClass } from "./ui";

/**
 * Receipt verification.
 *
 * The result is deliberately blunt: a devotee standing in the temple courtyard
 * needs to know "yes this is real" or "no it is not" without interpreting
 * jargon. A not-found result is careful not to accuse anyone of forgery, since
 * the far more common cause is a receipt that has not been published yet.
 */
export function VerifyReceipt() {
  const params = useSearchParams();
  const initial = params.get("ref") ?? "";

  const [input, setInput] = useState(initial);
  // Arriving via a QR link means a check is already in flight on first render.
  const [busy, setBusy] = useState(Boolean(initial));
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(reference: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await verifyDonationReceipt(reference));
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  // A QR code on a printed receipt links straight here with ?ref=…, so the
  // check should already be done by the time the page is readable. State is
  // touched only in the promise continuation, never synchronously.
  useEffect(() => {
    if (!initial) return;
    let active = true;
    verifyDonationReceipt(initial)
      .then((outcome) => {
        if (!active) return;
        setResult(outcome);
        setBusy(false);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(describeError(caught));
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initial]);

  return (
    <div className="mt-6 max-w-2xl">
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void check(input);
          }}
        >
          <Field
            label="Receipt number"
            htmlFor="receipt"
            hint="Printed at the top of your receipt, for example DON-2026-00001"
            required
          >
            <input
              id="receipt"
              name="receipt"
              className={inputClass}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="DON-2026-00001"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="receipt-hint"
              required
            />
          </Field>
          <Button type="submit" disabled={busy || input.trim().length === 0}>
            {busy ? "Checking…" : "Check this receipt"}
          </Button>
        </form>
      </Card>

      <div aria-live="polite" className="mt-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-alert-700/30 bg-alert-100 p-5">
            <p className="font-semibold text-alert-700">Could not check the receipt</p>
            <p className="mt-1 text-ink-700">{error}</p>
          </div>
        ) : null}

        {result?.status === "INVALID_FORMAT" ? (
          <div role="alert" className="rounded-xl border border-marigold-500/40 bg-marigold-100 p-5">
            <p className="font-semibold text-marigold-600">That does not look like a receipt number</p>
            <p className="mt-1 text-ink-700">
              A temple receipt number looks like <strong>DON-2026-00001</strong>. Please check the
              number on your receipt and type it again.
            </p>
          </div>
        ) : null}

        {result?.status === "NOT_FOUND" ? (
          <div className="rounded-xl border border-alert-700/30 bg-alert-100 p-5">
            <p className="font-semibold text-alert-700">
              Receipt {result.reference} is not in the published accounts
            </p>
            <p className="mt-1 text-ink-700">
              This usually means the donation has been recorded but not yet published — records are
              published after a second committee member has verified them. If your receipt is more
              than a few days old, please contact the temple committee and quote this number.
            </p>
          </div>
        ) : null}

        {result?.status === "FOUND" ? (
          <div className="rounded-xl border-2 border-verify-700 bg-white p-6">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-2xl">
                ✓
              </span>
              <p className="text-xl font-bold text-verify-700">
                This is a genuine temple donation
              </p>
            </div>

            <dl className="mt-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2 border-b border-sandal-200 pb-2">
                <dt className="font-semibold text-ink-500">Receipt number</dt>
                <dd className="amount font-semibold">{result.donation.receiptNo}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-sandal-200 pb-2">
                <dt className="font-semibold text-ink-500">Amount</dt>
                <dd className="amount text-lg font-bold text-temple-800">
                  {formatPaise(result.donation.amountPaise)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-sandal-200 pb-2">
                <dt className="font-semibold text-ink-500">Donor</dt>
                <dd>{result.donation.displayName}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-sandal-200 pb-2">
                <dt className="font-semibold text-ink-500">Given for</dt>
                <dd>{result.donation.purpose}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-sandal-200 pb-2">
                <dt className="font-semibold text-ink-500">Fund</dt>
                <dd>{result.donation.fundName}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-ink-500">Date of donation</dt>
                <dd>
                  {toDate(result.donation.occurredAt)?.toLocaleDateString("en-IN", {
                    dateStyle: "long",
                  }) ?? "—"}
                </dd>
              </div>
            </dl>

            {result.donation.corrected ? (
              <p className="mt-4 rounded-lg bg-marigold-100 p-3 text-ink-900">
                <strong>Note:</strong> this entry was corrected after it was first published. The
                original figure and the reason for the change are in the{" "}
                <a href="/transparency/corrections">corrections register</a>.
              </p>
            ) : null}

            <p className="mt-4 text-sm text-ink-500">
              Donor contact details are never shown here. Only the name the donor chose to display
              is public.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
