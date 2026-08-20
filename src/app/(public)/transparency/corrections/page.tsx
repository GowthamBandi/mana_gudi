import type { Metadata } from "next";
import Link from "next/link";
import { CorrectionsRegister } from "@/components/corrections-register";

export const metadata: Metadata = {
  title: "Corrections register",
  description:
    "A permanent public record of every change made to an already-published temple financial figure, including the old amount and the reason.",
  alternates: { canonical: "/transparency/corrections" },
};

export default function CorrectionsPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/transparency" prefetch={false}>Transparency</Link> <span aria-hidden="true">›</span> Corrections
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Corrections register</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-lg text-ink-700">
        <p>
          Sometimes a figure is entered wrongly and has to be corrected. When that happens, the
          temple does not quietly change the number. The old value, the new value, who changed it
          and why are all recorded — here, in public, permanently.
        </p>
        <p className="rounded-xl border border-sandal-200 bg-sandal-100 p-4 text-base">
          <strong>Why this matters:</strong> the system will not allow a published amount to be
          altered at all until the previous value has first been written into a permanent record.
          That record cannot be edited or deleted afterwards by anyone — not by the treasurer, and
          not by the head of the committee.
        </p>
      </div>

      <CorrectionsRegister />
    </>
  );
}
