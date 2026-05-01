import { requireUser } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: defense-in-depth — middleware also gates, but this re-validates server-side
  const { user } = await requireUser();

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="font-semibold">Meta Cert Portal</div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[var(--color-text-muted)] sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
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
