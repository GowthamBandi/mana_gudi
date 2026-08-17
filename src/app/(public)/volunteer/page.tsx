import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Volunteer for seva",
  description:
    "Offer your time for temple seva — festivals, annadanam, cleaning and upkeep.",
  alternates: { canonical: "/volunteer" },
};

export default function VolunteerPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Volunteer
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Volunteer for seva</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">
        The temple runs on the time given freely by the village. Volunteers are needed most around
        festivals and annadanam days.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-temple-700">Where help is needed</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-lg">
            <li>Annadanam — cooking and serving</li>
            <li>Festival preparation and decoration</li>
            <li>Crowd and queue management on busy days</li>
            <li>Cleaning the prakaram and premises</li>
            <li>Helping elderly devotees</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-temple-700">How to sign up</h2>
          <p className="mt-2 text-lg">
            Volunteer activities are listed on the events page as they are scheduled. Register for
            one the same way you would register for a pooja — just your name and mobile number.
          </p>
          <p className="mt-3">
            <Link href="/events">See upcoming volunteer activities →</Link>
          </p>
          <p className="mt-3 text-ink-700">
            You can also speak to any committee member at the temple office, or send a message
            through the <Link href="/feedback">suggestions form</Link>.
          </p>
        </Card>
      </div>
    </>
  );
}
