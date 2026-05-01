import { requireUser, getRole } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';
import { SidebarNav } from '@/components/learner/sidebar-nav';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: defense-in-depth — middleware also gates, but this re-validates server-side
  const { user } = await requireUser();
  const role = await getRole();
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="font-semibold">Meta Cert Portal</div>
          <div className="flex items-center gap-4 text-sm">
            {isAdmin && (
              <a
                href="/admin"
                className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
              >
                Admin
              </a>
            )}
            <span className="text-slate-600">{user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r bg-white md:block">
          <SidebarNav isAdmin={isAdmin} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
