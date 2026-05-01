import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tracks', label: 'Tracks' },
  { href: '/admin/quizzes', label: 'Quizzes' },
  { href: '/admin/enrollments', label: 'Enrollments' },
  { href: '/admin/users', label: 'Users' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: server-side gate — middleware also redirects non-admins, but
  // we re-check here so a tampered cookie still cannot reach admin RSCs.
  const { profile } = await requireRole('admin');

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-muted)] md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex shrink-0 flex-col border-b border-[var(--border)] bg-[var(--surface)] md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="border-b border-[var(--border)] px-4 py-4 text-sm font-semibold">Meta Cert Admin</div>
        <nav
          aria-label="Admin"
          className="flex flex-row gap-1 overflow-x-auto p-2 text-sm md:flex-col md:gap-0 md:overflow-visible"
        >
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="inline-flex h-11 shrink-0 items-center rounded-md px-3 text-[var(--color-text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--color-text)] md:h-auto md:py-2"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--color-text-muted)] md:block">
          <div className="mb-1 truncate">{profile.email}</div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
