import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact and location",
  description: "How to reach the temple, contact the committee, and find us on the map.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> Contact
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Contact the temple</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Where we are</h2>
          <address className="mt-2 not-italic text-lg">
            Mana Gudi
            <br />
            Temple Street, Village Centre
            <br />
            Andhra Pradesh, India
          </address>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Temple office</h2>
          <p className="mt-2 text-lg">
            The office is open during darshan hours. For anything about donations or accounts, ask
            for the treasurer.
          </p>
          <p className="mt-3">
            To raise something in writing, use the{" "}
            <Link href="/feedback" prefetch={false}>complaints and suggestions form</Link> — you will get a tracking
            number and can check progress online.
          </p>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-temple-800">Donation receipt queries</h2>
          <p className="mt-2 text-ink-700">
            If you made a donation and need to verify your receipt number, you can look it up at
            any time on the <Link href="/verify" prefetch={false}>verify a receipt</Link> page. No account needed.
          </p>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-temple-800">Seva and volunteering</h2>
          <p className="mt-2 text-ink-700">
            To offer seva during festivals or daily temple operations, register your name on the{" "}
            <Link href="/volunteer" prefetch={false}>volunteer page</Link>.
          </p>
        </Card>
      </div>
    </>
  );
}
