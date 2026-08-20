"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { type AdminIdentity } from "@/lib/domain/rbac";
import {
  createEvent,
  listAdminEvents,
  listEventRegistrations,
  updateEventStatus,
} from "@/lib/services/events";
import { EVENT_TYPES, EVENT_TYPE_LABELS, toDate, type EventType, type Registration, type TempleEvent } from "@/lib/services/types";
import { describeError } from "@/lib/use-async";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  StatusPill,
  inputClass,
} from "@/components/ui";
import { RequirePermission } from "@/components/admin/chrome";

export default function AdminEventsPage() {
  return (
    <RequirePermission permission="event:manage">
      <EventsWorkspace />
    </RequirePermission>
  );
}

function EventsWorkspace() {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;

  const [events, setEvents] = useState<TempleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminEvents();
      setEvents(data);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listAdminEvents()
      .then((data) => {
        if (!active) return;
        setEvents(data);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(describeError(caught));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!identity) return <LoadingState />;

  async function handleStatusChange(id: string, newStatus: TempleEvent["status"]) {
    setError(null);
    setNotice(null);
    try {
      await updateEventStatus(identity!, id, newStatus);
      setNotice(`Event status updated to ${newStatus}.`);
      await reload();
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  async function handleViewRegistrations(eventId: string) {
    setSelectedEventId(eventId);
    setLoadingRegistrations(true);
    try {
      const list = await listEventRegistrations(identity!, eventId);
      setRegistrations(list);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoadingRegistrations(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-800">Event Management</h1>
          <p className="mt-1 text-ink-700">
            Schedule and manage poojas, homams, festivals, and volunteer sevas.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>Create new event</Button>
      </div>

      {notice ? (
        <div className="rounded-xl bg-verify-100 p-4 font-semibold text-verify-900 border border-verify-300">
          {notice}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading ? <LoadingState label="Loading events" /> : null}
      {!loading && events.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          hint="Create an event to publish pooja, festival, or volunteer details for devotees."
        />
      ) : null}
      {!loading && events.length > 0 ? (
        <ul className="space-y-4">
          {events.map((event) => {
            const start = toDate(event.startAt);
            return (
              <li key={event.id}>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-temple-800">{event.title}</span>
                      <span className="rounded bg-marigold-100 px-2 py-0.5 text-xs font-semibold text-marigold-800">
                        {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                      </span>
                    </div>
                    <StatusPill status={event.status} />
                  </div>

                  <div className="mt-2 text-sm text-ink-700 space-y-1">
                    <p>
                      <strong>Date & Time:</strong> {start?.toLocaleString("en-IN") ?? "TBD"}
                    </p>
                    <p>
                      <strong>Location:</strong> {event.location}
                    </p>
                    {event.registrationRequired ? (
                      <p>
                        <strong>Capacity:</strong> {event.capacity > 0 ? `${event.capacity} seats` : "Unlimited"}{" "}
                        · <strong>Registered:</strong> {event.registrationCount} devotees
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-2 text-ink-700 line-clamp-2">{event.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-sandal-200">
                    {event.status === "DRAFT" ? (
                      <Button size="sm" onClick={() => void handleStatusChange(event.id, "PUBLISHED")}>
                        Publish event
                      </Button>
                    ) : null}
                    {event.status === "PUBLISHED" ? (
                      <Button size="sm" variant="secondary" onClick={() => void handleStatusChange(event.id, "CANCELLED")}>
                        Cancel event
                      </Button>
                    ) : null}
                    {event.registrationRequired ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleViewRegistrations(event.id)}
                      >
                        View participant registrations
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

      {showNewModal ? (
        <NewEventModal
          identity={identity}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            setNotice("Event created successfully.");
            void reload();
          }}
        />
      ) : null}

      {selectedEventId ? (
        <RegistrationsModal
          eventId={selectedEventId}
          registrations={registrations}
          loading={loadingRegistrations}
          onClose={() => setSelectedEventId(null)}
        />
      ) : null}
    </div>
  );
}

function NewEventModal({
  identity,
  onClose,
  onCreated,
}: {
  identity: AdminIdentity;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("POOJA");
  const [location, setLocation] = useState("Main Temple Mandapam");
  const [startDateStr, setStartDateStr] = useState("");
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [capacity, setCapacity] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(publishImmediately: boolean) {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!startDateStr) {
      setError("Date & time is required.");
      return;
    }
    setSubmitting(true);
    try {
      const startAt = new Date(startDateStr);
      const endAt = new Date(startAt.getTime() + 2 * 3600 * 1000); // 2 hours default
      await createEvent(identity, {
        title: title.trim(),
        description: description.trim(),
        eventType,
        location: location.trim(),
        startAt,
        endAt,
        registrationRequired,
        capacity: registrationRequired ? parseInt(capacity, 10) || 0 : 0,
        publishImmediately,
      });
      onCreated();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-temple-800">Create New Event</h2>

        {error ? <div className="rounded-lg bg-alert-100 p-3 text-sm text-alert-800">{error}</div> : null}

        <div className="space-y-4">
          <Field label="Event Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Maha Shivaratri Homam"
              required
              className={inputClass}
            />
          </Field>

          <Field label="Event Category">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className={inputClass}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details, schedule and instructions..."
              required
              className={inputClass}
              rows={3}
            />
          </Field>

          <Field label="Location">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Start Date & Time">
            <input
              type="datetime-local"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="req-reg"
              checked={registrationRequired}
              onChange={(e) => setRegistrationRequired(e.target.checked)}
              className="h-4 w-4 text-marigold-600 rounded border-sandal-300"
            />
            <label htmlFor="req-reg" className="text-sm font-semibold text-ink-700">
              Registration required for devotees
            </label>
          </div>

          {registrationRequired ? (
            <Field label="Maximum Participant Capacity">
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="50"
                className={inputClass}
              />
            </Field>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-sandal-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit(true)} disabled={submitting}>
            {submitting ? "Publishing…" : "Submit & Publish Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RegistrationsModal({
  registrations,
  loading,
  onClose,
}: {
  eventId: string;
  registrations: Registration[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-temple-800">Devotee Registrations</h2>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {loading ? <LoadingState label="Loading participant list" /> : null}
        {!loading && registrations.length === 0 ? (
          <p className="text-ink-500">No devotees have registered for this event yet.</p>
        ) : null}

        {!loading && registrations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-sandal-100 text-ink-900 uppercase text-xs font-semibold">
                <tr>
                  <th className="p-3">Devotee Name</th>
                  <th className="p-3">Mobile Phone</th>
                  <th className="p-3">Gotram / Nakshatra</th>
                  <th className="p-3">Count</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sandal-200">
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-semibold text-ink-900">{r.name}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3">
                      {r.gotram || "—"} / {r.nakshatra || "—"}
                    </td>
                    <td className="p-3">{r.participantCount}</td>
                    <td className="p-3">
                      <span className="rounded bg-verify-100 px-2 py-0.5 text-xs font-semibold text-verify-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
