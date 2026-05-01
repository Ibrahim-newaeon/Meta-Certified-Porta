'use client';
import { useActionState, useId, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { setRoleAction, inviteUserAction } from '@/app/admin/users/actions';
import { Button } from '@/components/shared/button';

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
