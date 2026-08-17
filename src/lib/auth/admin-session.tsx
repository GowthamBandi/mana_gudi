"use client";

/**
 * Administrator session.
 *
 * Being signed in is not the same as being an administrator. Firebase Auth
 * answers "who are you"; the administrator directory in Firestore answers "what
 * may you do". A user with a perfectly valid ID token but no `admin_users`
 * record has no privileges at all, and the security rules agree.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { isRole, type AdminIdentity } from "@/lib/domain/rbac";

export type SessionState =
  | { phase: "loading" }
  | { phase: "signed-out" }
  | { phase: "not-an-admin"; email: string }
  | { phase: "suspended"; identity: AdminIdentity }
  | { phase: "ready"; identity: AdminIdentity };

interface SessionContextValue {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signOutNow: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function resolveIdentity(user: User): Promise<SessionState> {
  const snapshot = await getDoc(doc(db(), "admin_users", user.uid));

  if (!snapshot.exists()) {
    return { phase: "not-an-admin", email: user.email ?? "" };
  }

  const data = snapshot.data();
  if (!isRole(data.role)) {
    // An unrecognised role is treated as no role rather than as a wildcard.
    return { phase: "not-an-admin", email: user.email ?? "" };
  }

  const identity: AdminIdentity = {
    uid: user.uid,
    role: data.role,
    status: data.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED",
    displayName: (data.displayName as string) ?? user.email ?? "Administrator",
    email: user.email ?? (data.email as string) ?? "",
  };

  return identity.status === "ACTIVE"
    ? { phase: "ready", identity }
    : { phase: "suspended", identity };
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ phase: "loading" });

  const applyUser = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ phase: "signed-out" });
      return;
    }
    try {
      setState(await resolveIdentity(user));
    } catch (error) {
      // A failure to read the directory must not be interpreted as "allowed".
      console.error("Could not resolve administrator identity", error);
      setState({ phase: "not-an-admin", email: user.email ?? "" });
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth(), applyUser), [applyUser]);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth(), email.trim(), password);
        await applyUser(credential.user);
      },
      signOutNow: async () => {
        await signOut(auth());
        setState({ phase: "signed-out" });
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth(), email.trim());
      },
      refresh: async () => {
        await applyUser(auth().currentUser);
      },
    }),
    [state, applyUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdminSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useAdminSession must be used inside an AdminSessionProvider");
  }
  return context;
}

/** Convenience hook returning the identity only when it is genuinely usable. */
export function useAdminIdentity(): AdminIdentity | null {
  const { state } = useAdminSession();
  return state.phase === "ready" ? state.identity : null;
}
