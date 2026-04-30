import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'learner';

export async function requireUser() {
  const supabase = await createClient();
  // SECURITY: getUser() validates the JWT against Supabase, unlike getSession()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { user, supabase };
}

export async function requireRole(role: Role) {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (error || !profile) redirect('/login');
  // SECURITY: hard fail if role mismatch — never silently fall back
  if (profile.role !== role) redirect('/dashboard');

  return { user, profile, supabase };
}

export async function getRole(): Promise<Role | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return (profile?.role as Role | undefined) ?? null;
}
