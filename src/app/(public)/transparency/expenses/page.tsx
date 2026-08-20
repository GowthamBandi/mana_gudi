import type { Metadata } from "next";
import Link from "next/link";
import { LedgerTable } from "@/components/ledger";

export const metadata: Metadata = {
  title: "Expense register",
  description:
    "Every rupee the temple has spent and published, with the category, fund and date for each voucher.",
  alternates: { canonical: "/transparency/expenses" },
};

export default function ExpensesPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/transparency" prefetch={false}>Transparency</Link> <span aria-hidden="true">›</span> Expenses
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Expense register</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-700">
        Every payment made by the temple, showing what it was for and which fund it came from. Each
        entry was approved by a second committee member before publication.
      </p>

      <LedgerTable kind="expenses" />
    </>
  );
}
