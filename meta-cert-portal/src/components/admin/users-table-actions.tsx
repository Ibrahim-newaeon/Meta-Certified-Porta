'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  setRoleAction,
  inviteUserAction,
  deleteUserAction,
  setUserPasswordAction,
  sendPasswordResetForUserAction,
} from '@/app/admin/users/actions';
import { Button } from '@/components/shared/button';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Dialog } from '@/components/shared/dialog';
import { Input, FieldLabel } from '@/components/shared/input';

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function InviteUserForm() {
  const [state, action] = useActionState(inviteUserAction, null);
  const emailId = useId();
  const roleId = useId();
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="min-w-0 flex-1 sm:min-w-[220px]">
        <label htmlFor={emailId} className="block text-xs font-medium text-[var(--color-text-muted)]">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          className="mt-1 block h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/20 focus:outline-none"
        />
      </div>
      <div className="w-40 shrink-0">
        <label htmlFor={roleId} className="block text-xs font-medium text-[var(--color-text-muted)]">
          Role
        </label>
        <select
          id={roleId}
          name="role"
          defaultValue="learner"
          className="mt-1 block h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/20 focus:outline-none"
        >
          <option value="learner">Learner</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Submit label="Send invite" pendingLabel="Sending invite…" />
      {state?.error && (
        <p role="alert" className="w-full text-sm text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="w-full text-sm text-emerald-700 dark:text-emerald-300">
          Invite sent.
        </p>
      )}
    </form>
  );
}

export function RoleToggle({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: 'admin' | 'learner';
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const next = currentRole === 'admin' ? 'learner' : 'admin';
  const blocked = isSelf && currentRole === 'admin';

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => start(() => setRoleAction(userId, next).then(() => {}))}
      disabled={pending || blocked}
      aria-label={`Change role to ${next}`}
      title={blocked ? 'You cannot demote yourself' : undefined}
    >
      {pending ? 'Updating…' : `Make ${next}`}
    </Button>
  );
}

export function DeleteUserButton({
  userId,
  email,
  isSelf,
}: {
  userId: string;
  email: string;
  isSelf: boolean;
}) {
  if (isSelf) {
    return (
      <Button variant="dangerOutline" size="sm" disabled title="You cannot delete yourself">
        Delete
      </Button>
    );
  }
  return (
    <ConfirmButton
      label="Delete"
      title={`Delete ${email}?`}
      description="This removes their auth account, profile, enrollments, progress, and exam attempts. This cannot be undone."
      confirmLabel="Delete user"
      pendingLabel="Deleting user…"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        const res = await deleteUserAction(userId);
        if (res?.error) throw new Error(res.error);
      }}
    />
  );
}

export function PasswordActionsButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const passwordId = useId();

  function handleSetPassword(formData: FormData) {
    setError(null);
    setStatus(null);
    const password = String(formData.get('password') ?? '');
    start(async () => {
      const res = await setUserPasswordAction(userId, password);
      if (res?.error) {
        setError(res.error);
      } else {
        setStatus('Password updated. Share it with the user securely.');
      }
    });
  }

  function handleSendReset() {
    setError(null);
    setStatus(null);
    start(async () => {
      const res = await sendPasswordResetForUserAction(userId);
      if (res?.error) {
        setError(res.error);
      } else {
        setStatus(`Reset link sent to ${email}.`);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Password
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Password — ${email}`}
        description="Set a new password directly, or send the user a reset email (requires SMTP)."
        size="sm"
      >
        <form action={handleSetPassword} className="space-y-3">
          <div>
            <FieldLabel htmlFor={passwordId}>New password</FieldLabel>
            <Input
              id={passwordId}
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              At least 8 characters.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
          {status && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
              {status}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSendReset}
              disabled={pending}
            >
              Send reset email
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Working…' : 'Set password'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
