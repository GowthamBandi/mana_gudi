import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata: Metadata = {
  title: "Complaints and suggestions",
  description:
    "Raise a complaint or make a suggestion to the temple committee, and track what happens to it using your tracking number.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Complaints and suggestions
      </nav>

      <h1 className="text-3xl font-bold text-temple-800">Complaints and suggestions</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">
        Tell the temple committee what is wrong or what could be better. You will get a tracking
        number so you can check what happened. You may leave your name out if you prefer.
      </p>

      <FeedbackForm />
    </>
  );
}
