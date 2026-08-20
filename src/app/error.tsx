"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught error:", error);
  }, [error]);

  return (
    <div className="mx-auto my-12 max-w-xl rounded-2xl border-2 border-alert-700/40 bg-sandal-50 p-8 text-center shadow-lg">
      <span className="text-4xl" role="img" aria-label="Temple">
        🛕
      </span>
      <h1 className="mt-4 text-2xl font-bold text-temple-800">This page couldn&apos;t load</h1>
      <p className="mt-2 text-ink-700">
        We encountered a temporary problem loading the temple records. Please check your internet connection and try reloading.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-temple-700 px-5 py-2.5 font-semibold text-white hover:bg-temple-800"
        >
          Reload to try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-temple-700 bg-white px-5 py-2.5 font-semibold text-temple-800 hover:bg-sandal-100"
        >
          Go to home page
        </Link>
      </div>
    </div>
  );
}
