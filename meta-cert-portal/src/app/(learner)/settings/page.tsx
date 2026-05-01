import { requireUser } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';

export default async function SettingsPage() {
  const { user, supabase } = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Profile</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Email</dt>
          <dd>{profile?.email ?? user.email}</dd>
          <dt className="text-slate-500">Name</dt>
          <dd>{profile?.full_name || '—'}</dd>
          <dt className="text-slate-500">Role</dt>
          <dd className="capitalize">{profile?.role ?? 'learner'}</dd>
          <dt className="text-slate-500">Joined</dt>
          <dd>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString()
              : '—'}
          </dd>
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Session</h2>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
