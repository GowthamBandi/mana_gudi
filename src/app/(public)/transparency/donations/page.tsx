import type { Metadata } from "next";
import Link from "next/link";
import { LedgerTable } from "@/components/ledger";

export const metadata: Metadata = {
  title: "Donation register",
  description:
    "Every donation the temple has received and published, searchable by receipt number, donor display name, purpose or fund.",
  alternates: { canonical: "/transparency/donations" },
};

export default function DonationsPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/transparency" prefetch={false}>Transparency</Link> <span aria-hidden="true">›</span> Donations
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Donation register</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-700">
        Every donation below has been recorded by one committee member and verified by a second
        before being published. Donors who asked to remain anonymous are shown as{" "}
        <em>Anonymous Devotee</em>; phone numbers and addresses are never published.
      </p>

      <LedgerTable kind="donations" />
    </>
  );
}
