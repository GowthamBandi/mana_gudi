import type { Metadata } from "next";
import Link from "next/link";
import { VideosClient } from "./videos-client";

export const metadata: Metadata = {
  title: "Temple Video Archive",
  description: "Video recordings of annual festival pravachanams, homams, and utsavams.",
  alternates: { canonical: "/videos" },
};

export default function VideosPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> Videos
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Temple Video Archive</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        Video recordings of spiritual discourses, annual festivals, and temple rituals.
      </p>

      <div className="mt-8">
        <VideosClient />
      </div>
    </>
  );
}
