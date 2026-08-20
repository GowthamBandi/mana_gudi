import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "About the temple",
  description:
    "The history of the temple, the deities worshipped here, daily timings and how the temple committee is run.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> About
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">About our temple</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="history">
            <h2 id="history" className="text-2xl font-semibold text-temple-700">
              History
            </h2>
            <p className="mt-2 text-lg">
              The temple has stood at the centre of village life for generations. It was built and
              maintained by the families of this village, and it continues to be run by a committee
              drawn from among them. Every major repair, festival and act of service recorded in
              these pages was paid for by the village itself.
            </p>
          </section>

          <section aria-labelledby="deities">
            <h2 id="deities" className="text-2xl font-semibold text-temple-700">
              Deities
            </h2>
            <p className="mt-2 text-lg">
              The main sanctum houses the presiding deity, with shrines to the attendant deities
              around the prakaram. Daily worship follows the traditional order of Suprabhatam,
              Abhishekam, Archana and Deeparadhana.
            </p>
          </section>

          <section aria-labelledby="governance">
            <h2 id="governance" className="text-2xl font-semibold text-temple-700">
              How the temple is run
            </h2>
            <p className="mt-2 text-lg">
              The temple is managed by an authorized committee. Every donation and expenditure is
              recorded directly, audited permanently, and published immediately to the village transparency
              ledger.
            </p>
            <p className="mt-2 text-lg">
              If a published figure ever has to be corrected, the original figure is preserved and
              the correction is listed publicly in the{" "}
              <Link href="/transparency/corrections" prefetch={false}>corrections register</Link>.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-temple-700">Darshan timings</h2>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-4">
                <dt>Morning</dt>
                <dd className="amount">6:00 am – 11:30 am</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Evening</dt>
                <dd className="amount">5:00 pm – 8:30 pm</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-temple-700">Daily poojas</h2>
            <ul className="mt-2 space-y-1">
              <li className="flex justify-between gap-4">
                <span>Suprabhatam</span> <span className="amount">6:00 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Abhishekam</span> <span className="amount">7:30 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Archana</span> <span className="amount">11:00 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Deeparadhana</span> <span className="amount">6:30 pm</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
