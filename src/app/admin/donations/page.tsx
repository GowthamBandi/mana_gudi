"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { formatPaise, rupeesToPaise } from "@/lib/domain/money";
import { DISPLAY_PREFERENCE_LABELS, DISPLAY_PREFERENCES } from "@/lib/domain/donor-privacy";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import {
  WorkflowError,
  correctDonation,
  createDonation,
  listDonations,
} from "@/lib/services/donations";
import { PAYMENT_METHODS, toDate, type Donation } from "@/lib/services/types";
import { describeError } from "@/lib/use-async";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  StatusPill,
  inputClass,
} from "@/components/ui";
import { RequirePermission } from "@/components/admin/chrome";
import { ProofUpload } from "@/components/admin/proof-upload";

const FILTERS = ["PUBLISHED", "ALL"] as const;

export default function AdminDonationsPage() {
  return (
    <RequirePermission permission="donation:read">
      <DonationsWorkspace />
    </RequirePermission>
  );
}

function DonationsWorkspace() {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("PUBLISHED");
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listDonations(filter === "ALL" ? "ALL" : filter, { pageSize: 50 });
      setItems(page.items);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    listDonations(filter === "ALL" ? "ALL" : filter, { pageSize: 50 })
      .then((page) => {
        if (!active) return;
        setItems(page.items);
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
  }, [filter]);

  if (!identity) return <LoadingState />;

  return (
    <>
      <h1 className="text-2xl font-bold text-temple-800">Donations</h1>
      <p className="mt-1 max-w-3xl text-ink-700">
        Record temple donations with single-authority immediate publication. Every donation is
        immediately visible on the public website, auditable, and immutable.
      </p>

      {can(identity, "donation:create") ? (
        <div className="mt-6">
          <NewDonationForm reload={reload} />
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="ledger">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="ledger" className="text-xl font-semibold text-temple-800">
            Donation ledger
          </h2>
          <div>
            <label htmlFor="status-filter" className="mr-2 font-medium">
              Show
            </label>
            <select
              id="status-filter"
              className="min-h-11 rounded-lg border border-sandal-300 bg-white px-3"
              value={filter}
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setFilter(event.target.value as (typeof FILTERS)[number]);
              }}
            >
              {FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All records" : value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {notice ? (
          <p role="status" className="mb-4 rounded-lg bg-verify-100 p-3 font-medium text-verify-700">
            {notice}
          </p>
        ) : null}

        {error ? <ErrorState title="Could not load donations" message={error} /> : null}

        {loading ? (
          <LoadingState label="Loading donation records…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No donations recorded yet"
            description="When a committee member records a donation, it will appear here and on the public website immediately."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-1">
            {items.map((donation) => (
              <DonationRow
                key={donation.id}
                donation={donation}
                reload={reload}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DonationRow({
  donation,
  reload,
}: {
  donation: Donation;
  reload: () => Promise<void>;
}) {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;
  const [correcting, setCorrecting] = useState(false);

  const date = toDate(donation.occurredAt);
  const formattedDate = date
    ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Date unknown";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-temple-800">{donation.receiptNo}</span>
            <StatusPill status={donation.status} />
            {donation.supportingDocPath && (
              <span className="rounded bg-sandal-200 px-2 py-0.5 text-xs font-semibold text-temple-900">
                📷 Proof Attached
              </span>
            )}
          </div>
          <p className="mt-1 text-lg font-bold text-ink-900">{donation.donorName}</p>
          <p className="text-sm text-ink-700">
            {donation.purpose} · {donation.paymentMethod}
          </p>
          {donation.donorPhone && (
            <p className="text-xs text-ink-500">Phone: {donation.donorPhone} (Private)</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-temple-900">{formatPaise(donation.amountPaise)}</p>
          <p className="text-xs text-ink-500">{formattedDate}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sandal-100 pt-3 text-xs text-ink-600">
        <div>
          <span>Display: {DISPLAY_PREFERENCE_LABELS[donation.displayPreference]}</span>
          {donation.revisionCount > 0 && (
            <span className="ml-2 font-semibold text-marigold-600">
              · Corrected {donation.revisionCount} time(s)
            </span>
          )}
        </div>

        {can(identity, "donation:correct") && (
          <Button variant="secondary" size="small" onClick={() => setCorrecting((v) => !v)}>
            {correcting ? "Cancel Correction" : "Correct Record"}
          </Button>
        )}
      </div>

      {correcting && identity && (
        <CorrectionForm donation={donation} identity={identity} reload={reload} onDone={() => setCorrecting(false)} />
      )}
    </Card>
  );
}

function CorrectionForm({
  donation,
  identity,
  reload,
  onDone,
}: {
  donation: Donation;
  identity: AdminIdentity;
  reload: () => Promise<void>;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState((donation.amountPaise / 100).toString());
  const [purpose, setPurpose] = useState(donation.purpose);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 rounded-xl border border-alert-300 bg-alert-50 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          await correctDonation(
            identity,
            donation.id,
            {
              amountPaise: rupeesToPaise(amount),
              purpose,
            },
            reason,
          );
          await reload();
          onDone();
        } catch (caught) {
          setError(caught instanceof WorkflowError ? caught.message : describeError(caught));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-bold text-alert-900">Correct Published Donation</h3>
      <p className="text-xs text-alert-700 mt-1">
        This creates an immutable witnessed revision record. The previous amount and reason will be saved permanently.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Corrected Amount (₹)" htmlFor={`c-amt-${donation.id}`} required>
          <input
            id={`c-amt-${donation.id}`}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field label="Corrected Purpose" htmlFor={`c-purp-${donation.id}`} required>
          <input
            id={`c-purp-${donation.id}`}
            className={inputClass}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Reason for correction" htmlFor={`c-reason-${donation.id}`} required hint="Explain why the figure changed. This is saved permanently.">
        <textarea
          id={`c-reason-${donation.id}`}
          className={`${inputClass} min-h-16`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </Field>

      {error && <p className="mt-2 text-xs font-bold text-alert-700">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="small" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="danger" size="small" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Record Correction"}
        </Button>
      </div>
    </form>
  );
}

function NewDonationForm({ reload }: { reload: () => Promise<void> }) {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supportingDocPath, setSupportingDocPath] = useState<string>("");

  const [form, setForm] = useState({
    donorName: "",
    donorPhone: "",
    amount: "",
    purpose: "General Donation",
    fundId: "fund-general",
    displayPreference: "FULL" as (typeof DISPLAY_PREFERENCES)[number],
    paymentMethod: "CASH" as (typeof PAYMENT_METHODS)[number],
    occurredAt: new Date().toISOString().slice(0, 10),
  });

  if (!identity) return null;

  function update(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-temple-800">Record a new donation</h2>
        <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "New donation"}
        </Button>
      </div>

      {success ? (
        <p role="status" className="mt-3 rounded-lg bg-verify-100 p-3 font-medium text-verify-700">
          {success}
        </p>
      ) : null}

      {open ? (
        <form
          className="mt-4"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            setSuccess(null);
            try {
              const result = await createDonation(identity, {
                donorName: form.donorName,
                donorPhone: form.donorPhone || null,
                displayPreference: form.displayPreference,
                amountPaise: rupeesToPaise(form.amount),
                purpose: form.purpose,
                fundId: form.fundId,
                occurredAt: new Date(form.occurredAt),
                paymentMethod: form.paymentMethod,
                supportingDocPath,
              });
              setSuccess(
                `Recorded and published donation ${result.receiptNo}. It is now visible on the public website.`,
              );
              setForm((previous) => ({ ...previous, donorName: "", donorPhone: "", amount: "" }));
              setSupportingDocPath("");
              await reload();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : describeError(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-4">
            <Field label="Donor name" htmlFor="d-name" required>
              <input
                id="d-name"
                className={inputClass}
                value={form.donorName}
                onChange={(e) => update("donorName", e.target.value)}
                required
              />
            </Field>
            <Field label="Amount (₹)" htmlFor="d-amount" required>
              <input
                id="d-amount"
                className={inputClass}
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                required
              />
            </Field>
            <Field label="Donor mobile" htmlFor="d-phone" hint="Never published">
              <input
                id="d-phone"
                className={inputClass}
                value={form.donorPhone}
                onChange={(e) => update("donorPhone", e.target.value)}
              />
            </Field>
            <Field label="Purpose" htmlFor="d-purpose" required>
              <input
                id="d-purpose"
                className={inputClass}
                value={form.purpose}
                onChange={(e) => update("purpose", e.target.value)}
                required
              />
            </Field>
            <Field label="How the donor is shown publicly" htmlFor="d-display" required>
              <select
                id="d-display"
                className={inputClass}
                value={form.displayPreference}
                onChange={(e) => update("displayPreference", e.target.value)}
              >
                {DISPLAY_PREFERENCES.map((preference) => (
                  <option key={preference} value={preference}>
                    {DISPLAY_PREFERENCE_LABELS[preference]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment method" htmlFor="d-method" required>
              <select
                id="d-method"
                className={inputClass}
                value={form.paymentMethod}
                onChange={(e) => update("paymentMethod", e.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date received" htmlFor="d-date" required>
              <input
                id="d-date"
                type="date"
                className={inputClass}
                value={form.occurredAt}
                onChange={(e) => update("occurredAt", e.target.value)}
                required
              />
            </Field>
            <Field label="Fund" htmlFor="d-fund" required>
              <select
                id="d-fund"
                className={inputClass}
                value={form.fundId}
                onChange={(e) => update("fundId", e.target.value)}
              >
                <option value="fund-general">General Fund</option>
                <option value="fund-annadanam">Annadanam Fund</option>
                <option value="fund-development">Temple Development Fund</option>
                <option value="fund-festivals">Festivals Fund</option>
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <ProofUpload
              kind="donations"
              onUploaded={(path) => setSupportingDocPath(path)}
              label="Upload Payment Proof / Receipt (Optional)"
            />
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-alert-100 p-3 font-medium text-alert-700">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Submit & Publish Donation"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
