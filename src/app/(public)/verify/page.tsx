import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { VerifyReceipt } from "@/components/verify-receipt";
import { LoadingState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verify a donation receipt",
  description:
    "Type a temple receipt number to confirm the donation is genuinely recorded in the published temple accounts.",
  alternates: { canonical: "/verify" },
};

export default function VerifyPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Verify a receipt
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Verify a donation receipt</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">
        Every receipt the temple issues has a number printed on it, like{" "}
        <span className="amount font-semibold">DON-2026-00001</span>. Type it below to check that
        the donation really is in the temple&apos;s published accounts.
      </p>

      <Suspense fallback={<LoadingState label="Preparing" />}>
        <VerifyReceipt />
      </Suspense>
    </>
  );
}
