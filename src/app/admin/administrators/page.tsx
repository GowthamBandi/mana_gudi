"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/lib/auth/admin-session";
import { ROLES, ROLE_LABELS, type AdminIdentity, type Role } from "@/lib/domain/rbac";
import {
  listAdministrators,
  provisionAdministrator,
  updateAdminRole,
  updateAdminStatus,
  type AdminUserRecord,
} from "@/lib/services/admins";
import { describeError } from "@/lib/use-async";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  StatusPill,
  inputClass,
} from "@/components/ui";
import { RequirePermission } from "@/components/admin/chrome";

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="admin:manage">
      <AdministratorsWorkspace />
    </RequirePermission>
  );
}

function AdministratorsWorkspace() {
  const { state: session } = useAdminSession();
  const identity = session.phase === "ready" ? session.identity : null;

  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const reload = useCallback(async () => {
    if (!identity) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdministrators(identity);
      setAdmins(data);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    let active = true;
    listAdministrators(identity)
      .then((data) => {
        if (!active) return;
        setAdmins(data);
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
  }, [identity]);

  if (!identity) return <LoadingState />;

  async function handleRoleChange(uid: string, newRole: Role) {
    setError(null);
    setNotice(null);
    try {
      await updateAdminRole(identity!, uid, newRole);
      setNotice(`Updated user role to ${ROLE_LABELS[newRole]}.`);
      await reload();
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  async function handleStatusToggle(uid: string, currentStatus: "ACTIVE" | "SUSPENDED") {
    setError(null);
    setNotice(null);
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateAdminStatus(identity!, uid, nextStatus);
      setNotice(`${nextStatus === "SUSPENDED" ? "Suspended" : "Reactivated"} committee user access.`);
      await reload();
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-800">Committee Administrators</h1>
          <p className="mt-1 text-ink-700">
            Provision accounts and assign roles. Suspended accounts lose access immediately.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add committee member</Button>
      </div>

      {notice ? (
        <div className="rounded-xl bg-verify-100 p-4 font-semibold text-verify-900 border border-verify-300">
          {notice}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading ? <LoadingState label="Loading committee members" /> : null}
      {!loading && admins.length === 0 ? (
        <EmptyState title="No administrators found" />
      ) : null}

      {!loading && admins.length > 0 ? (
        <>
          {/* Mobile Card List */}
          <div className="space-y-3 md:hidden">
            {admins.map((user) => {
              const isSelf = user.uid === identity.uid;
              return (
                <div
                  key={user.uid}
                  className={`rounded-xl border border-sandal-200 bg-white p-4 shadow-sm ${
                    user.status === "SUSPENDED" ? "bg-alert-50/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink-900">
                        {user.displayName} {isSelf ? "(You)" : ""}
                      </p>
                      <p className="font-mono text-xs text-ink-500">{user.email}</p>
                    </div>
                    <StatusPill status={user.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-sandal-100 pt-3">
                    <div className="text-xs">
                      <span className="text-ink-500">Role: </span>
                      {isSelf ? (
                        <span className="font-semibold text-temple-800">{ROLE_LABELS[user.role]}</span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => void handleRoleChange(user.uid, e.target.value as Role)}
                          className={`${inputClass} text-xs py-1 inline-block w-auto`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {!isSelf ? (
                      <Button
                        size="small"
                        variant={user.status === "ACTIVE" ? "secondary" : "primary"}
                        onClick={() => void handleStatusToggle(user.uid, user.status)}
                      >
                        {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-500 italic">Self (Protected)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-sandal-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-sandal-100 text-ink-900 uppercase text-xs font-semibold">
                <tr>
                  <th className="p-3">Committee Member</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sandal-200">
                {admins.map((user) => {
                  const isSelf = user.uid === identity.uid;
                  return (
                    <tr key={user.uid} className={user.status === "SUSPENDED" ? "bg-alert-50/50" : ""}>
                      <td className="p-3 font-semibold text-ink-900">
                        {user.displayName} {isSelf ? "(You)" : ""}
                      </td>
                      <td className="p-3 font-mono text-xs">{user.email}</td>
                      <td className="p-3">
                        {isSelf ? (
                          <span className="font-semibold text-temple-800">{ROLE_LABELS[user.role]}</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => void handleRoleChange(user.uid, e.target.value as Role)}
                            className={`${inputClass} text-xs py-1`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusPill status={user.status} />
                      </td>
                      <td className="p-3 text-right">
                        {!isSelf ? (
                          <Button
                            size="small"
                            variant={user.status === "ACTIVE" ? "secondary" : "primary"}
                            onClick={() => void handleStatusToggle(user.uid, user.status)}
                          >
                            {user.status === "ACTIVE" ? "Suspend access" : "Reactivate"}
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-500 italic">Self (Protected)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {showAddModal ? (
        <AddAdminModal
          identity={identity}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            setNotice("Committee member added successfully.");
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function AddAdminModal({
  identity,
  onClose,
  onCreated,
}: {
  identity: AdminIdentity;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [uid, setUid] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("FINANCE_ADMIN");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!uid.trim()) {
      setError("Firebase Auth User ID (UID) is required.");
      return;
    }
    setSubmitting(true);
    try {
      await provisionAdministrator(identity, {
        uid: uid.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        role,
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
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4"
      >
        <h2 className="text-xl font-bold text-temple-800">Add Committee Administrator</h2>
        <p className="text-sm text-ink-700">
          Link a Firebase Auth user UID to a committee role.
        </p>

        {error ? <div className="rounded-lg bg-alert-100 p-3 text-sm text-alert-800">{error}</div> : null}

        <Field label="Auth User ID (UID)">
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="e.g., uid-finance-3"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Full Name">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Sundaram Ayyar"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Email Address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sundaram@temple.test"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Assigned Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-4 border-t border-sandal-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            Provision Administrator
          </Button>
        </div>
      </form>
    </div>
  );
}
