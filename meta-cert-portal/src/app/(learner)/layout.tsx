import { requireUser } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: defense-in-depth — middleware also gates, but this re-validates server-side
  const { user } = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="font-semibold">Meta Cert Portal</div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  );
}
