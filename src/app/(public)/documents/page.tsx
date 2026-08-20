import type { Metadata } from "next";
import Link from "next/link";
import { DocumentsClient } from "./documents-client";

export const metadata: Metadata = {
  title: "Temple Public Documents",
  description: "Official documents, annual trust accounts, resolution notices and committee bylaws.",
  alternates: { canonical: "/documents" },
};

export default function DocumentsPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" prefetch={false}>Home</Link> <span aria-hidden="true">›</span> Documents
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Temple Public Documents</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        Official trust documents, committee meeting resolutions, annual audit statements, and temple bylaws.
      </p>

      <div className="mt-8">
        <DocumentsClient />
      </div>
    </>
  );
}
