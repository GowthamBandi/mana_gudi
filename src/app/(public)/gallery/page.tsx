import type { Metadata } from "next";
import Link from "next/link";
import { GalleryClient } from "./gallery-client";

export const metadata: Metadata = {
  title: "Temple Photo Gallery",
  description: "Photographs of festival celebrations, gopuram repairs, homams and daily poojas.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> Gallery
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Temple Photo Gallery</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        Photographs of annual festivals, daily rituals, temple maintenance, and community sevas.
      </p>

      <div className="mt-8">
        <GalleryClient />
      </div>
    </>
  );
}
