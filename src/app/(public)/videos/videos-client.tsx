"use client";

import { publicVideos } from "@/lib/services/public-data";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";

import { useLanguage } from "@/lib/i18n/context";

export function VideosClient() {
  const state = useAsync(() => publicVideos(), []);
  const { t } = useLanguage();

  if (state.phase === "loading") return <LoadingState label={t.loadingLabel} />;
  if (state.phase === "error") return <ErrorState message={state.message} onRetry={state.reload} />;
  if (state.phase === "ready" && state.data.length === 0) {
    return (
      <EmptyState
        title={t.emptyVideosTitle}
        hint={t.emptyVideosHint}
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {state.data.map((item) => (
        <li key={item.id}>
          <Card>
            {item.youtubeId ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${item.youtubeId}`}
                  title={item.title}
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video w-full rounded-lg bg-temple-900 text-white flex items-center justify-center font-semibold p-4 text-center">
                <span>[Video recording: {item.title}]</span>
              </div>
            )}
            <h3 className="mt-3 text-lg font-bold text-temple-800">{item.title}</h3>
            <p className="mt-1 text-sm text-ink-700">{item.description}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
