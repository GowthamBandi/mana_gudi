import type { Metadata } from "next";
import Link from "next/link";
import { TransparencyDashboard } from "@/components/transparency-dashboard";

export const metadata: Metadata = {
  title: "Temple Transparency Centre",
  description:
    "Complete public accounts of the temple: donations received, money spent, fund balances, and a permanent register of every correction made.",
  alternates: { canonical: "/transparency" },
};

export default function TransparencyPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> Transparency
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold text-temple-800 break-words">Temple Transparency Centre</h1>
      <p className="mt-3 max-w-3xl text-base sm:text-lg text-ink-700">
        This page is the temple&apos;s public account book. It shows what came in, what went out,
        and what is left. No login is needed. If a published figure is ever changed, the change is
        recorded permanently in the corrections register — the old number never simply disappears.
      </p>

      <TransparencyDashboard />
    </>
  );
}
