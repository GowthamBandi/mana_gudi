"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { formatPaise, rupeesToPaise } from "@/lib/domain/money";
import { DISPLAY_PREFERENCE_LABELS, DISPLAY_PREFERENCES } from "@/lib/domain/donor-privacy";
import { evaluateTransition } from "@/lib/domain/financial-state";
import { can } from "@/lib/domain/rbac";
import {
  WorkflowError,
  correctDonation,
  createDonation,
  listDonations,
  publishDonation,
  rejectDonation,
  submitDonation,
  verifyDonation,
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

const FILTERS = ["SUBMITTED", "DRAFT", "VERIFIED", "PUBLISHED", "REJECTED", "ALL"] as const;

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

  // Treasurers land on their action queue; auditors and anyone who cannot
  // verify land on the full ledger, since an empty "awaiting verification"
  // list would otherwise look like the temple has no records at all.
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(
    identity && can(identity, "donation:verify") ? "SUBMITTED" : "ALL",
  );
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listDonations(filter === "ALL" ? "ALL" : filter, { pageSize: 25 });
      setItems(page.items);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // State is set only in the promise continuation, never synchronously in the
  // effect body — a synchronous setState here would cause a cascading render.
  // The "loading" flag for a filter change is set by the change handler below,
  // which is an event handler and may set state directly.
  useEffect(() => {
    let active = true;
    listDonations(filter === "ALL" ? "ALL" : filter, { pageSize: 25 })
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

  async function act(action: () => Promise<void>, successMessage: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      await reload();
    } catch (caught) {
      setError(caught instanceof WorkflowError ? caught.message : describeError(caught));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-temple-800">Donations</h1>
      <p className="mt-1 max-w-3xl text-ink-700">
        Every donation is recorded by one person and verified by another before it can be published
        to the public ledger. You cannot verify a record you created yourself.
      </p>

      {can(identity, "donation:create") ? (
        <div className="mt-6">
          <NewDonationForm reload={reload} />
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="ledger">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="ledger" className="text-xl font-semibold text-temple-800">
            Donation records
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
        {error ? (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        ) : null}

        {loading ? <LoadingState label="Loading donations" /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState
            title="No donations in this list"
            hint="Change the filter above, or record a new donation."
          />
        ) : null}

        <ul className="space-y-4">
          {items.map((donation) => (
            <li key={donation.id}>
              <DonationRow donation={donation} onAct={act} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function DonationRow({
  donation,
  onAct,
}: {
  donation: Donation;
  onAct: (action: () => Promise<void>, message: string) => Promise<void>;
}) {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;
  const [correcting, setCorrecting] = useState(false);

  if (!identity) return null;

  const context = {
    kind: "donation" as const,
    actorUid: identity.uid,
    actorRole: identity.role,
    actorStatus: identity.status,
    createdBy: donation.createdBy,
  };

  const canSubmit = evaluateTransition(donation.status, "SUBMITTED", context).ok;
  const verifyCheck = evaluateTransition(donation.status, "VERIFIED", context);
  const canPublish = evaluateTransition(donation.status, "PUBLISHED", context).ok;
  const isOwn = donation.createdBy === identity.uid;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="amount text-lg font-semibold text-temple-800">{donation.receiptNo}</p>
        <StatusPill status={donation.status} />
      </div>

      <p className="mt-1">
        <span className="amount text-xl font-bold">{formatPaise(donation.amountPaise)}</span> ·{" "}
        {donation.purpose}
      </p>
      <p className="text-ink-700">
        {donation.donorName}{" "}
        <span className="text-sm text-ink-500">
          (shown publicly as: {DISPLAY_PREFERENCE_LABELS[donation.displayPreference]})
        </span>
      </p>
      <p className="mt-1 text-sm text-ink-500">
        {donation.paymentMethod} · recorded{" "}
        {toDate(donation.createdAt)?.toLocaleString("en-IN") ?? "recently"}
        {donation.revisionCount > 0 ? ` · corrected ${donation.revisionCount} time(s)` : ""}
      </p>

      {donation.rejectionReason ? (
        <p className="mt-2 rounded-lg bg-alert-100 p-2 text-alert-700">
          Sent back: {donation.rejectionReason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canSubmit ? (
          <Button
            onClick={() =>
              void onAct(
                () => submitDonation(identity, donation.id),
                `${donation.receiptNo} submitted for verification.`,
              )
            }
          >
            Submit for verification
          </Button>
        ) : null}

        {donation.status === "SUBMITTED" ? (
          verifyCheck.ok ? (
            <>
              <Button
                onClick={() =>
                  void onAct(
                    () => verifyDonation(identity, donation.id),
                    `${donation.receiptNo} verified.`,
                  )
                }
              >
                Verify this record
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = window.prompt("Why is this being sent back?");
                  if (!reason?.trim()) return;
                  void onAct(
                    () => rejectDonation(identity, donation.id, reason),
                    `${donation.receiptNo} sent back to the creator.`,
                  );
                }}
              >
                Send back
              </Button>
            </>
          ) : (
            <p className="rounded-lg bg-marigold-100 p-2 text-marigold-600">
              {isOwn
                ? "You recorded this donation, so another committee member must verify it."
                : verifyCheck.reason}
            </p>
          )
        ) : null}

        {canPublish ? (
          <Button
            onClick={() =>
              void onAct(
                () => publishDonation(identity, donation.id),
                `${donation.receiptNo} published to the public ledger.`,
              )
            }
          >
            Publish publicly
          </Button>
        ) : null}

        {donation.status === "PUBLISHED" && can(identity, "donation:publish") ? (
          // Repair action for the rare case where the internal record was
          // published but writing the public copy failed.
          <Button
            variant="quiet"
            onClick={() =>
              void onAct(
                () => publishDonation(identity, donation.id),
                `Public copy of ${donation.receiptNo} re-synced.`,
              )
            }
          >
            Re-sync public copy
          </Button>
        ) : null}

        {donation.status === "PUBLISHED" && can(identity, "donation:correct") ? (
          <Button variant="secondary" onClick={() => setCorrecting((value) => !value)}>
            {correcting ? "Cancel correction" : "Correct this record"}
          </Button>
        ) : null}
      </div>

      {correcting ? (
        <CorrectionForm
          donation={donation}
          onAct={onAct}
          onClose={() => setCorrecting(false)}
        />
      ) : null}
    </Card>
  );
}

function CorrectionForm({
  donation,
  onAct,
  onClose,
}: {
  donation: Donation;
  onAct: (action: () => Promise<void>, message: string) => Promise<void>;
  onClose: () => void;
}) {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;
  const [amount, setAmount] = useState(String(donation.amountPaise / 100));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!identity) return null;

  return (
    <div className="mt-4 rounded-xl border-2 border-marigold-500 bg-marigold-100 p-4">
      <h3 className="font-semibold text-temple-800">Correct a published record</h3>
      <p className="mt-1 text-sm text-ink-700">
        The current figure of <strong>{formatPaise(donation.amountPaise)}</strong> will be written
        permanently into the correction history before it changes. It will also appear in the
        public corrections register. This cannot be undone or hidden.
      </p>

      {/*
        noValidate: validation is handled in code so that errors are rendered
        into a role="alert" region. Native browser bubbles are inconsistently
        announced by screen readers and disappear on the next interaction.
      */}
      <form
        className="mt-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          let paise: number;
          try {
            paise = rupeesToPaise(amount);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Invalid amount");
            return;
          }
          if (!reason.trim()) {
            setError("A reason is required — it is published for everyone to read.");
            return;
          }
          // Close the form once the correction lands, but leave the success
          // notice for the treasurer to read — it must not be overwritten.
          void onAct(
            () => correctDonation(identity, donation.id, { amountPaise: paise }, reason.trim()),
            `${donation.receiptNo} corrected. The change is now in the public corrections register.`,
          ).then(onClose);
        }}
      >
        <Field label="Corrected amount (₹)" htmlFor={`amt-${donation.id}`} required>
          <input
            id={`amt-${donation.id}`}
            className={inputClass}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            required
          />
        </Field>
        <Field
          label="Reason for the correction"
          htmlFor={`why-${donation.id}`}
          hint="This is shown publicly. Explain plainly, as a villager would understand it."
          required
        >
          <textarea
            id={`why-${donation.id}`}
            className={`${inputClass} min-h-20`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="mb-3 font-medium text-alert-700">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="danger">
          Record this correction permanently
        </Button>
      </form>
    </div>
  );
}

function NewDonationForm({ reload }: { reload: () => Promise<void> }) {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
              const result = await createDonation(identity!, {
                donorName: form.donorName,
                donorPhone: form.donorPhone || null,
                displayPreference: form.displayPreference,
                amountPaise: rupeesToPaise(form.amount),
                purpose: form.purpose,
                fundId: form.fundId,
                occurredAt: new Date(form.occurredAt),
                paymentMethod: form.paymentMethod,
                submitImmediately: true,
              });
              setSuccess(
                `Recorded receipt ${result.receiptNo}. It now needs a second committee member to verify it.`,
              );
              setForm((previous) => ({ ...previous, donorName: "", donorPhone: "", amount: "" }));
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

          {error ? (
            <p role="alert" className="mb-4 rounded-lg bg-alert-100 p-3 font-medium text-alert-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? "Recording…" : "Record and submit for verification"}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
