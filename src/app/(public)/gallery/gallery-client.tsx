"use client";

import { publicGallery } from "@/lib/services/public-data";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";

import { useLanguage } from "@/lib/i18n/context";

export function GalleryClient() {
  const state = useAsync(() => publicGallery(), []);
  const { t } = useLanguage();

  if (state.phase === "loading") return <LoadingState label={t.loadingLabel} />;
  if (state.phase === "error") return <ErrorState message={state.message} onRetry={state.reload} />;
  if (state.phase === "ready" && state.data.length === 0) {
    return (
      <EmptyState
        title={t.emptyGalleryTitle}
        hint={t.emptyGalleryHint}
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {state.data.map((item) => (
        <li key={item.id}>
          <Card className="h-full flex flex-col justify-between overflow-hidden">
            <div>
              <div className="aspect-video w-full rounded-lg bg-sandal-200 overflow-hidden flex items-center justify-center text-ink-500 font-semibold">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <span>[Temple Photo: {item.title}]</span>
                )}
              </div>
              <h3 className="mt-3 text-lg font-bold text-temple-800">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-700">{item.caption}</p>
            </div>
            <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-marigold-700">
              {item.category}
            </span>
          </Card>
        </li>
      ))}
    </ul>
  );
}
