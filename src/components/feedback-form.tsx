"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateTrackingCode } from "@/lib/domain/ids";
import { describeError } from "@/lib/use-async";
import { Button, Card, Field, inputClass } from "./ui";

/**
 * Public complaint and suggestion form.
 *
 * The tracking code doubles as the document ID and as the capability to read
 * that one document back. It is generated with crypto-strength randomness for
 * exactly that reason — a guessable code would expose one villager's complaint
 * to another.
 */
export function FeedbackForm() {
  const [type, setType] = useState<"COMPLAINT" | "SUGGESTION">("COMPLAINT");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);

  if (tracking) {
    return (
      <div
        role="status"
        className="mt-6 max-w-2xl rounded-xl border-2 border-verify-700 bg-white p-6"
      >
        <h2 className="text-xl font-bold text-verify-700">Thank you — it has been recorded</h2>
        <p className="mt-2">Your tracking number is:</p>
        <p className="amount my-3 text-2xl font-bold text-temple-800">{tracking}</p>
        <p className="text-ink-700">
          Please write this number down or take a photo of this screen. Quote it if you contact the
          committee. Only someone who knows this number can look up what you wrote.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-2xl">
      <Card>
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            if (message.trim().length < 10) {
              setError("Please describe the matter in a little more detail.");
              return;
            }
            setBusy(true);
            setError(null);

            const code = generateTrackingCode();
            try {
              await setDoc(doc(db(), "feedback", code), {
                type,
                message: message.trim(),
                contactName: contactName.trim() || null,
                contactPhone: contactPhone.trim() || null,
                status: "SUBMITTED",
                createdAt: serverTimestamp(),
              });
              setTracking(code);
            } catch (caught) {
              setError(describeError(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset className="mb-4">
            <legend className="mb-2 font-semibold">What would you like to raise?</legend>
            <div className="flex gap-4">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="COMPLAINT"
                  checked={type === "COMPLAINT"}
                  onChange={() => setType("COMPLAINT")}
                />
                A complaint
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="SUGGESTION"
                  checked={type === "SUGGESTION"}
                  onChange={() => setType("SUGGESTION")}
                />
                A suggestion
              </label>
            </div>
          </fieldset>

          <Field
            label="Tell us what happened"
            htmlFor="fb-message"
            hint="Describe it in your own words."
            required
          >
            <textarea
              id="fb-message"
              className={`${inputClass} min-h-32`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </Field>

          <div className="grid gap-0 sm:grid-cols-2 sm:gap-4">
            <Field label="Your name" htmlFor="fb-name" hint="Optional — you may stay anonymous">
              <input
                id="fb-name"
                className={inputClass}
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Your mobile" htmlFor="fb-phone" hint="Optional — only if you want a reply">
              <input
                id="fb-phone"
                type="tel"
                className={inputClass}
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                autoComplete="tel"
              />
            </Field>
          </div>

          {error ? (
            <p role="alert" className="mb-4 rounded-lg bg-alert-100 p-3 font-medium text-alert-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send to the committee"}
          </Button>
          <p className="mt-3 text-sm text-ink-500">
            What you write here is not shown on the public website. Only the temple committee can
            read it.
          </p>
        </form>
      </Card>
    </div>
  );
}
