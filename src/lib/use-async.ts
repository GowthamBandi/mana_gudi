"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; data: T };

/**
 * Runs a one-shot async read and models every outcome explicitly.
 *
 * There is deliberately no "data is undefined while loading" state: a page that
 * cannot distinguish "still loading" from "there is nothing" ends up telling a
 * devotee the temple has no donations when the network is merely slow.
 *
 * Results are ignored after unmount, so a slow Firestore read on a flaky
 * village connection cannot set state on a page the user has already left.
 */
export function useAsync<T>(
  run: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ phase: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ phase: "loading" });
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    run()
      .then((data) => {
        if (active) setState({ phase: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ phase: "error", message: describeError(error) });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}

/**
 * Turns a Firebase error into something a villager can act on.
 * A raw "FirebaseError: Missing or insufficient permissions" helps nobody.
 */
export function describeError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";

  if (code === "permission-denied") {
    return "You do not have permission to view this. If you think this is wrong, contact the temple committee.";
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Could not reach the temple records. Check your internet connection and try again.";
  }
  if (code === "not-found") {
    return "That record could not be found.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "That email address and password do not match.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed attempts. Wait a few minutes before trying again.";
  }
  if (code === "auth/network-request-failed") {
    return "No internet connection. Please try again once you are back online.";
  }

  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
