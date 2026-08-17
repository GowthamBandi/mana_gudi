"use client";

import { announcements } from "@/lib/services/public-data";
import { toDate } from "@/lib/services/types";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, LoadingState } from "./ui";

const CATEGORY_LABELS: Record<string, string> = {
  FESTIVAL: "Festival",
  TIMINGS: "Timings",
  EMERGENCY: "Urgent",
  REMINDER: "Reminder",
  CLOSURE: "Closure",
  CAMPAIGN: "Appeal",
};

export function AnnouncementsList() {
  const state = useAsync(() => announcements(50), []);

  if (state.phase === "loading") return <LoadingState label="Loading notices" />;
  if (state.phase === "error")
    return (
      <div className="mt-6">
        <ErrorState message={state.message} onRetry={state.reload} />
      </div>
    );
  if (state.data.length === 0)
    return (
      <div className="mt-6">
        <EmptyState
          title="There are no notices at the moment"
          hint="Announcements from the temple committee will appear here."
        />
      </div>
    );

  return (
    <ul className="mt-6 space-y-4">
      {state.data.map((announcement) => {
        const at = toDate(announcement.publishedAt);
        const urgent = announcement.category === "EMERGENCY";
        return (
          <li key={announcement.id}>
            <Card className={urgent ? "border-2 border-alert-700" : ""}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-sm font-semibold ${
                    urgent ? "bg-alert-100 text-alert-700" : "bg-marigold-100 text-marigold-600"
                  }`}
                >
                  {CATEGORY_LABELS[announcement.category] ?? announcement.category}
                </span>
                {at ? (
                  <time dateTime={at.toISOString()} className="text-sm text-ink-500">
                    {at.toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </time>
                ) : null}
              </div>
              <h2 className="mt-2 text-xl font-semibold text-temple-800">{announcement.title}</h2>
              <p className="mt-1 whitespace-pre-line text-lg">{announcement.body}</p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
