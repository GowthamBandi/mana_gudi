"use client";

import { publicDocuments } from "@/lib/services/public-data";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";

import { useLanguage } from "@/lib/i18n/context";

export function DocumentsClient() {
  const state = useAsync(() => publicDocuments(), []);
  const { t } = useLanguage();

  if (state.phase === "loading") return <LoadingState label={t.loadingLabel} />;
  if (state.phase === "error") return <ErrorState message={state.message} onRetry={state.reload} />;
  if (state.phase === "ready" && state.data.length === 0) {
    return (
      <EmptyState
        title={t.emptyDocumentsTitle}
        hint={t.emptyDocumentsHint}
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {state.data.map((docItem) => (
        <li key={docItem.id}>
          <Card className="flex items-center justify-between gap-4">
            <div>
              <span className="rounded bg-sandal-200 px-2 py-0.5 text-xs font-semibold text-temple-900">
                {docItem.category}
              </span>
              <h3 className="mt-2 text-lg font-bold text-temple-800">{docItem.title}</h3>
              <p className="mt-1 text-xs text-ink-500">{docItem.fileSizeLabel || "PDF Document"}</p>
            </div>
            {docItem.fileUrl ? (
              <a
                href={docItem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-temple-700 px-4 font-semibold text-white no-underline hover:bg-temple-800 text-sm whitespace-nowrap"
              >
                Download PDF
              </a>
            ) : (
              <span className="text-xs text-ink-500 italic">Available at office</span>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
