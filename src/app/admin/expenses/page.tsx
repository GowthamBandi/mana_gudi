"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { formatPaise, rupeesToPaise } from "@/lib/domain/money";
import { can, type AdminIdentity } from "@/lib/domain/rbac";
import {
  EXPENSE_CATEGORIES,
  correctExpense,
  createExpense,
  listExpenses,
} from "@/lib/services/expenses";
import { publicFunds } from "@/lib/services/public-data";
import { type Expense, type Fund } from "@/lib/services/types";
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

export const FILTERS = ["PUBLISHED", "ALL"] as const;

export default function AdminExpensesPage() {
  return (
    <RequirePermission permission="expense:read">
      <ExpensesWorkspace />
    </RequirePermission>
  );
}

function ExpensesWorkspace() {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("PUBLISHED");
  const [items, setItems] = useState<Expense[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, fundsList] = await Promise.all([
        listExpenses(filter === "ALL" ? "ALL" : filter, { pageSize: 50 }),
        publicFunds(),
      ]);
      setItems(page.items);
      setFunds(fundsList);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listExpenses(filter === "ALL" ? "ALL" : filter, { pageSize: 50 }),
      publicFunds(),
    ])
      .then(([page, fundsList]) => {
        if (!active) return;
        setItems(page.items);
        setFunds(fundsList);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-800">Expense Vouchers</h1>
          <p className="mt-1 text-ink-700">
            Record and publish temple expenditures. Every expense voucher is immediately published
            to public accounts, auditable, and immutable.
          </p>
        </div>
        {can(identity, "expense:create") ? (
          <Button onClick={() => setShowNewModal(true)}>New Expense Voucher</Button>
        ) : null}
      </div>

      {notice ? (
        <div className="rounded-xl bg-verify-100 p-4 font-semibold text-verify-900 border border-verify-300">
          {notice}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sandal-200 bg-white p-3">
        <label htmlFor="expense-status-filter" className="text-sm font-semibold text-ink-700">
          Filter status:
        </label>
        <select
          id="expense-status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])}
          className={inputClass}
        >
          <option value="PUBLISHED">Published expenses</option>
          <option value="ALL">All expenses</option>
        </select>
      </div>

      {loading ? <LoadingState label="Loading expense vouchers" /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No expense vouchers recorded yet"
          description="When a committee member records an expense voucher, it will appear here and on public accounts immediately."
        />
      ) : null}
      {!loading && items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-1">
          {items.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              identity={identity}
              funds={funds}
              reload={reload}
            />
          ))}
        </div>
      ) : null}

      {showNewModal ? (
        <NewExpenseModal
          identity={identity}
          onClose={() => setShowNewModal(false)}
          onCreated={(voucherNo) => {
            setShowNewModal(false);
            setNotice(`Recorded and published voucher ${voucherNo}.`);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ExpenseCard({
  expense,
  identity,
  reload,
}: {
  expense: Expense;
  identity: AdminIdentity;
  funds: Fund[];
  reload: () => Promise<void>;
}) {
  const [correcting, setCorrecting] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-temple-800">{expense.voucherNo}</span>
            <StatusPill status={expense.status} />
            <span className="rounded bg-sandal-200 px-2 py-0.5 text-xs font-semibold text-temple-900">
              {expense.category}
            </span>
            {expense.supportingDocPath && (
              <span className="rounded bg-sandal-200 px-2 py-0.5 text-xs font-semibold text-temple-900">
                📄 Proof Attached
              </span>
            )}
          </div>
          <p className="mt-1 text-lg font-bold text-ink-900">{expense.description}</p>
          <p className="text-sm text-ink-700">Payee / Vendor: {expense.payeeDisplay}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-temple-900">{formatPaise(expense.amountPaise)}</p>
          <p className="text-xs text-ink-500">
            {new Date(expense.occurredAt as unknown as string).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sandal-100 pt-3 text-xs text-ink-600">
        <div>
          {expense.revisionCount > 0 && (
            <span className="font-semibold text-marigold-600">
              Corrected {expense.revisionCount} time(s)
            </span>
          )}
        </div>

        {can(identity, "expense:correct") && (
          <Button variant="secondary" size="small" onClick={() => setCorrecting((v) => !v)}>
            {correcting ? "Cancel Correction" : "Correct Expense"}
          </Button>
        )}
      </div>

      {correcting && (
        <ExpenseCorrectionForm
          expense={expense}
          identity={identity}
          reload={reload}
          onDone={() => setCorrecting(false)}
        />
      )}
    </Card>
  );
}

function ExpenseCorrectionForm({
  expense,
  identity,
  reload,
  onDone,
}: {
  expense: Expense;
  identity: AdminIdentity;
  reload: () => Promise<void>;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState((expense.amountPaise / 100).toString());
  const [description, setDescription] = useState(expense.description);
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
          await correctExpense(
            identity,
            expense.id,
            {
              amountPaise: rupeesToPaise(amount),
              description,
            },
            reason,
          );
          await reload();
          onDone();
        } catch (caught) {
          setError(describeError(caught));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-bold text-alert-900">Correct Published Expense</h3>
      <p className="text-xs text-alert-700 mt-1">
        This creates an immutable witnessed revision record. The previous figure and reason will be saved permanently.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Corrected Amount (₹)" htmlFor={`ce-amt-${expense.id}`} required>
          <input
            id={`ce-amt-${expense.id}`}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field label="Corrected Description" htmlFor={`ce-desc-${expense.id}`} required>
          <input
            id={`ce-desc-${expense.id}`}
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Reason for correction" htmlFor={`ce-reason-${expense.id}`} required hint="Explain plainly why the expense figure changed.">
        <textarea
          id={`ce-reason-${expense.id}`}
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

function NewExpenseModal({
  identity,
  onClose,
  onCreated,
}: {
  identity: AdminIdentity;
  onClose: () => void;
  onCreated: (voucherNo: string) => void;
}) {
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [payeeDisplay, setPayeeDisplay] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [supportingDocPath, setSupportingDocPath] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <Card className="w-full max-w-xl my-8">
        <div className="flex items-center justify-between gap-3 border-b border-sandal-200 pb-3">
          <h2 className="text-xl font-bold text-temple-900">Record & Publish Expense</h2>
          <Button variant="secondary" size="small" onClick={onClose}>
            ✕ Close
          </Button>
        </div>

        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
              const res = await createExpense(identity, {
                category,
                description,
                amountPaise: rupeesToPaise(amountRupees),
                payeeDisplay,
                occurredAt: new Date(occurredAt),
                supportingDocPath,
              });
              onCreated(res.voucherNo);
            } catch (err) {
              setError(describeError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="exp-category" required>
              <select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Amount (₹)" htmlFor="exp-amount" required>
              <input
                id="exp-amount"
                inputMode="decimal"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2500"
                required
              />
            </Field>

            <Field label="Vendor / Payee Name" htmlFor="exp-payee" required>
              <input
                id="exp-payee"
                value={payeeDisplay}
                onChange={(e) => setPayeeDisplay(e.target.value)}
                className={inputClass}
                placeholder="e.g. Sri Lakshmi Traders"
                required
              />
            </Field>

            <Field label="Expense Date" htmlFor="exp-date" required>
              <input
                id="exp-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <Field label="Description / Voucher Details" htmlFor="exp-desc" required>
            <textarea
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-20`}
              placeholder="Describe what the expense was for..."
              required
            />
          </Field>

          <ProofUpload
            kind="expenses"
            onUploaded={(path) => setSupportingDocPath(path)}
            label="Upload Bill / Voucher Proof (Optional)"
          />

          {error && <p className="text-sm font-bold text-alert-700">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Submit & Publish Expense"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
