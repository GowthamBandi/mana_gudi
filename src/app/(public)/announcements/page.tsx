import type { Metadata } from "next";
import Link from "next/link";
import { AnnouncementsList } from "@/components/announcements-list";

export const metadata: Metadata = {
  title: "Notices and announcements",
  description:
    "Temple notices: festival announcements, changes to timings, closures and urgent messages from the committee.",
  alternates: { canonical: "/announcements" },
};

export default function AnnouncementsPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Notices
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Notices from the committee</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">
        Changes to timings, festival plans, closures and other announcements.
      </p>

      <AnnouncementsList />
    </>
  );
}
