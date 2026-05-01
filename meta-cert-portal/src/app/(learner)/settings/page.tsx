import { requireUser } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';
import { Button } from '@/components/shared/button';

export default async function SettingsPage() {
  const { user, supabase } = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)]">Profile</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-[var(--color-text-subtle)]">Email</dt>
          <dd>{profile?.email ?? user.email}</dd>
          <dt className="text-[var(--color-text-subtle)]">Name</dt>
          <dd>{profile?.full_name || '—'}</dd>
          <dt className="text-[var(--color-text-subtle)]">Role</dt>
          <dd className="capitalize">{profile?.role ?? 'learner'}</dd>
          <dt className="text-[var(--color-text-subtle)]">Joined</dt>
          <dd>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString()
              : '—'}
          </dd>
        </dl>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)]">Session</h2>
        <form action={signOutAction} className="mt-3">
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
