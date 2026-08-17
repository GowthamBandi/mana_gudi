"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminSession } from "@/lib/auth/admin-session";
import { describeError } from "@/lib/use-async";
import { Button, Card, Field, inputClass } from "@/components/ui";

/**
 * Committee sign-in.
 *
 * There is deliberately no "create account" link. Administrators are
 * provisioned by an existing super administrator; a public registration path
 * into a system that controls temple money would be indefensible.
 */
export default function AdminLoginPage() {
  const { state, signIn, resetPassword } = useAdminSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (state.phase === "ready") router.replace("/admin");
  }, [state.phase, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/admin");
    } catch (caught) {
      // The same message is shown whether the email is unknown or the password
      // is wrong, so this form cannot be used to discover which addresses are
      // committee accounts.
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function requestReset() {
    if (!email.trim()) {
      setError("Enter your email address first, then choose 'Forgot password'.");
      return;
    }
    try {
      await resetPassword(email);
    } catch {
      // Deliberately ignored: revealing that an address is unknown would leak
      // which accounts exist.
    }
    setResetSent(true);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="mb-6 text-center">
        <Link href="/">← Back to the temple website</Link>
      </p>

      <Card>
        <h1 className="text-2xl font-bold text-temple-800">Committee sign in</h1>
        <p className="mt-1 text-ink-700">
          For temple committee members only. Accounts are created by the head of the committee.
        </p>

        <form onSubmit={submit} className="mt-6" noValidate>
          <Field label="Email address" htmlFor="email" required>
            <input
              id="email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password" required>
            <input
              id="password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          {error ? (
            <p role="alert" className="mb-4 rounded-lg bg-alert-100 p-3 font-medium text-alert-700">
              {error}
            </p>
          ) : null}

          {resetSent ? (
            <p role="status" className="mb-4 rounded-lg bg-verify-100 p-3 text-verify-700">
              If that address belongs to a committee account, a password reset email has been sent.
            </p>
          ) : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void requestReset()}
            className="underline text-temple-800"
          >
            Forgot your password?
          </button>
        </p>
      </Card>
    </div>
  );
}
