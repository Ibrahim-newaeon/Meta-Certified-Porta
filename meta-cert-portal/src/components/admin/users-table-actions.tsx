'use client';
import { useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { setRoleAction, inviteUserAction } from '@/app/admin/users/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Working…' : label}
    </button>
  );
}

export function InviteUserForm() {
  const [state, action] = useActionState(inviteUserAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      <div className="flex-1">
        <label className="text-xs font-medium text-slate-600">Email</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-40">
        <label className="text-xs font-medium text-slate-600">Role</label>
        <select
          name="role"
          defaultValue="learner"
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          <option value="learner">Learner</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Submit label="Send invite" />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm text-green-600">Invite sent.</p>}
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

  return (
    <button
      onClick={() => start(() => setRoleAction(userId, next).then(() => {}))}
      disabled={pending || (isSelf && currentRole === 'admin')}
      title={isSelf && currentRole === 'admin' ? 'You cannot demote yourself' : undefined}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
    >
      {pending ? '…' : `Make ${next}`}
    </button>
  );
}
