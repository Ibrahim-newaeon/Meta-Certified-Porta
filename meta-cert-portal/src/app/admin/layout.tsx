import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';
import { signOutAction } from '@/app/(auth)/login/actions';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tracks', label: 'Tracks' },
  { href: '/admin/users', label: 'Users' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // SECURITY: server-side gate — middleware also redirects non-admins, but
  // we re-check here so a tampered cookie still cannot reach admin RSCs.
  const { profile } = await requireRole('admin');

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] bg-slate-50">
      <aside className="border-r bg-white">
        <div className="border-b px-4 py-4 text-sm font-semibold">Meta Cert Admin</div>
        <nav className="flex flex-col p-2 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-[220px] border-t bg-white p-3 text-xs text-slate-500">
          <div className="mb-1 truncate">{profile.email}</div>
          <form action={signOutAction}>
            <button type="submit" className="text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="p-6">{children}</main>
    </div>
  );
}
