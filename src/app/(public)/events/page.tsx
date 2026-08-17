import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { EventsBrowser } from "@/components/events-browser";
import { LoadingState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Events, poojas and homams",
  description:
    "Upcoming poojas, homams, festivals and annadanam at the temple, with online registration where required.",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Events
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Events, poojas and homams</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-700">
        Everything happening at the temple. Where registration is needed, you can register here —
        no account required, just your name and mobile number.
      </p>

      <Suspense fallback={<LoadingState label="Loading events" />}>
        <EventsBrowser />
      </Suspense>
    </>
  );
}
