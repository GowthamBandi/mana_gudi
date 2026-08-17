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
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Contact
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Contact the temple</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Where we are</h2>
          <address className="mt-2 not-italic text-lg">
            Sri Temple Seva
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
            <Link href="/feedback">complaints and suggestions form</Link> — you will get a tracking
            number.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Questions about a receipt</h2>
          <p className="mt-2 text-lg">
            If you have a receipt and want to confirm it is genuine, you can check it yourself at
            any time on the <Link href="/verify">verify a receipt</Link> page. No account needed.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Volunteering</h2>
          <p className="mt-2 text-lg">
            To help with festivals, annadanam or temple upkeep, see the{" "}
            <Link href="/volunteer">volunteer page</Link>.
          </p>
        </Card>
      </div>
    </>
  );
}
