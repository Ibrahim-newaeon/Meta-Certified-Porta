import { requireUser } from '@/lib/auth/roles';

// Phase-2 placeholder. Phase 4 (`04-content-delivery.md`) replaces this with
// the real dashboard (continue-learning card + enrolled track grid).
export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-600">
        Signed in as {user.email}
        {profile?.full_name ? ` (${profile.full_name})` : ''}.
      </p>
      <p className="text-sm text-slate-500">
        Role: <span className="font-mono">{profile?.role ?? 'unknown'}</span>
      </p>
      <p className="text-sm text-slate-500">
        Phase 4 will replace this stub with the track browser and resume-learning card.
      </p>
    </div>
  );
}
