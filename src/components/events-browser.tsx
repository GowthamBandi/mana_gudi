"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatPaise } from "@/lib/domain/money";
import { publicEvent, upcomingEvents } from "@/lib/services/public-data";
import { EVENT_TYPE_LABELS, toDate, type TempleEvent } from "@/lib/services/types";
import { MAX_PARTICIPANTS, registerForEvent } from "@/lib/services/registrations";
import { useAsync } from "@/lib/use-async";
import { Button, Card, EmptyState, ErrorState, Field, LoadingState, inputClass } from "./ui";

export function EventsBrowser() {
  const params = useSearchParams();
  const selectedId = params.get("id");

  return selectedId ? <EventDetail id={selectedId} /> : <EventList />;
}

function EventList() {
  const state = useAsync(() => upcomingEvents(30), []);

  if (state.phase === "loading") return <LoadingState label="Loading events" />;
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
          title="No events are scheduled at the moment"
          hint="Festival and pooja dates appear here as soon as the committee fixes them."
        />
      </div>
    );

  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2">
      {state.data.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event }: { event: TempleEvent }) {
  const start = toDate(event.startAt);
  const full = event.capacity > 0 && event.registrationCount >= event.capacity;

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-marigold-600">
        {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
        {event.deity ? ` · ${event.deity}` : ""}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-temple-800">
        <Link href={`/events?id=${event.id}`}>{event.title}</Link>
      </h2>
      {start ? (
        <p className="mt-1 font-medium text-ink-900">
          <time dateTime={start.toISOString()}>
            {start.toLocaleDateString("en-IN", { dateStyle: "full" })} at{" "}
            {start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </time>
        </p>
      ) : null}
      <p className="mt-2 text-ink-700">{event.description}</p>
      <p className="mt-2 text-sm text-ink-500">{event.location}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {event.feePaise > 0 ? (
          <span className="amount font-semibold">{formatPaise(event.feePaise)} per person</span>
        ) : (
          <span className="font-semibold text-verify-700">No charge</span>
        )}
        {event.registrationRequired ? (
          full ? (
            <span className="rounded bg-alert-100 px-2 py-0.5 text-sm font-semibold text-alert-700">
              Registration full
            </span>
          ) : (
            <Link href={`/events?id=${event.id}`}>Register →</Link>
          )
        ) : null}
      </div>
    </Card>
  );
}

function EventDetail({ id }: { id: string }) {
  const state = useAsync(() => publicEvent(id), [id]);

  if (state.phase === "loading") return <LoadingState label="Loading event" />;
  if (state.phase === "error")
    return (
      <div className="mt-6">
        <ErrorState message={state.message} onRetry={state.reload} />
      </div>
    );
  if (!state.data)
    return (
      <div className="mt-6">
        <EmptyState
          title="That event could not be found"
          hint="It may have been removed. See all upcoming events instead."
        />
        <p className="mt-4">
          <Link href="/events">← Back to all events</Link>
        </p>
      </div>
    );

  const event = state.data;
  const start = toDate(event.startAt);
  const end = toDate(event.endAt);
  const full = event.capacity > 0 && event.registrationCount >= event.capacity;

  return (
    <div className="mt-6">
      <p className="mb-4">
        <Link href="/events">← All events</Link>
      </p>

      <article>
        <p className="text-sm font-semibold uppercase tracking-wide text-marigold-600">
          {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-temple-800">{event.title}</h2>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink-500">When</dt>
            <dd>
              {start ? (
                <time dateTime={start.toISOString()}>
                  {start.toLocaleDateString("en-IN", { dateStyle: "full" })}
                  <br />
                  {start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  {end
                    ? ` – ${end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
                    : ""}
                </time>
              ) : (
                "To be announced"
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-500">Where</dt>
            <dd>{event.location}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-500">Deity</dt>
            <dd>{event.deity || "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-500">Contribution</dt>
            <dd className="amount">
              {event.feePaise > 0 ? `${formatPaise(event.feePaise)} per person` : "No charge"}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-lg">{event.description}</p>

        {event.instructions ? (
          <div className="mt-4 rounded-xl border border-sandal-200 bg-sandal-100 p-4">
            <h3 className="font-semibold text-temple-700">Please note</h3>
            <p className="mt-1">{event.instructions}</p>
          </div>
        ) : null}

        {event.materials ? (
          <div className="mt-4">
            <h3 className="font-semibold text-temple-700">What to bring</h3>
            <p className="mt-1">{event.materials}</p>
          </div>
        ) : null}
      </article>

      {event.registrationRequired ? (
        <section className="mt-8" aria-labelledby="register">
          <h3 id="register" className="mb-4 text-xl font-semibold text-temple-800">
            Register for this {EVENT_TYPE_LABELS[event.eventType]?.toLowerCase() ?? "event"}
          </h3>
          {full ? (
            <EmptyState
              title="Registration is full"
              hint="All places have been taken. Please contact the temple committee to be added to a waiting list."
            />
          ) : (
            <RegistrationForm event={event} />
          )}
        </section>
      ) : (
        <p className="mt-8 rounded-xl border border-sandal-200 bg-sandal-100 p-4">
          No registration is needed for this event. All devotees are welcome.
        </p>
      )}
    </div>
  );
}

function RegistrationForm({ event }: { event: TempleEvent }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gotram: "",
    nakshatra: "",
    participantCount: "1",
    specialRequest: "",
  });
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [done, setDone] = useState<"REGISTERED" | "REFUSED" | null>(null);
  const [refusedMessage, setRefusedMessage] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // guards a double-tapped submit button
    setBusy(true);
    setFieldError(null);
    setFailure(null);

    const outcome = await registerForEvent({
      eventId: event.id,
      name: form.name,
      phone: form.phone,
      email: form.email,
      gotram: form.gotram,
      nakshatra: form.nakshatra,
      participantCount: Number(form.participantCount),
      specialRequest: form.specialRequest,
    });

    setBusy(false);
    if (outcome.status === "INVALID") setFieldError({ field: outcome.field, message: outcome.message });
    else if (outcome.status === "FAILED") setFailure(outcome.message);
    else if (outcome.status === "REFUSED") {
      setRefusedMessage(outcome.message);
      setDone("REFUSED");
    } else setDone(outcome.status);
  }

  if (done) {
    const registered = done === "REGISTERED";
    return (
      <div
        role="status"
        className={`rounded-xl border-2 bg-white p-6 ${
          registered ? "border-verify-700" : "border-marigold-500"
        }`}
      >
        <p
          className={`text-xl font-bold ${registered ? "text-verify-700" : "text-marigold-600"}`}
        >
          {registered ? "You are registered" : "You are already registered"}
        </p>
        <p className="mt-2 text-ink-700">
          {registered
            ? `Thank you, ${form.name}. Your registration for ${event.title} is confirmed.`
            : refusedMessage}
        </p>
        <p className="mt-3">
          Please arrive a few minutes early and mention your mobile number at the registration desk.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <Field
          label="Your name"
          htmlFor="reg-name"
          required
          error={fieldError?.field === "name" ? fieldError.message : undefined}
        >
          <input
            id="reg-name"
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="name"
            aria-invalid={fieldError?.field === "name"}
            required
          />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="reg-phone"
          hint="10 digits. We use this only to contact you about this event."
          required
          error={fieldError?.field === "phone" ? fieldError.message : undefined}
        >
          <input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            className={inputClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            autoComplete="tel"
            aria-invalid={fieldError?.field === "phone"}
            required
          />
        </Field>

        <Field
          label="How many people are coming?"
          htmlFor="reg-count"
          required
          error={fieldError?.field === "participantCount" ? fieldError.message : undefined}
        >
          <input
            id="reg-count"
            type="number"
            min={1}
            max={MAX_PARTICIPANTS}
            className={inputClass}
            value={form.participantCount}
            onChange={(e) => update("participantCount", e.target.value)}
            required
          />
        </Field>

        {event.eventType === "HOMAM" || event.eventType === "POOJA" ? (
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-4">
            <Field label="Gotram" htmlFor="reg-gotram" hint="Only if you know it">
              <input
                id="reg-gotram"
                className={inputClass}
                value={form.gotram}
                onChange={(e) => update("gotram", e.target.value)}
              />
            </Field>
            <Field label="Nakshatram" htmlFor="reg-nakshatra" hint="Only if you know it">
              <input
                id="reg-nakshatra"
                className={inputClass}
                value={form.nakshatra}
                onChange={(e) => update("nakshatra", e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <Field label="Email address" htmlFor="reg-email" hint="Optional">
          <input
            id="reg-email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
          />
        </Field>

        <Field label="Anything the temple should know?" htmlFor="reg-note" hint="Optional">
          <textarea
            id="reg-note"
            className={`${inputClass} min-h-24`}
            value={form.specialRequest}
            onChange={(e) => update("specialRequest", e.target.value)}
          />
        </Field>

        {failure ? (
          <p role="alert" className="mb-4 rounded-lg bg-alert-100 p-3 font-medium text-alert-700">
            {failure}
          </p>
        ) : null}

        <Button type="submit" disabled={busy}>
          {busy ? "Registering…" : "Confirm my registration"}
        </Button>
        <p className="mt-3 text-sm text-ink-500">
          Your phone number is visible only to the temple committee. It is never published.
        </p>
      </form>
    </Card>
  );
}
