'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tracks', label: 'Tracks' },
  { href: '/exams', label: 'Exams' },
  { href: '/tutor', label: 'Tutor' },
  { href: '/settings', label: 'Settings' },
];

export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? '';
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              'rounded-md px-3 py-2 text-sm transition-colors ' +
              (active
                ? 'bg-emerald-50 font-medium text-emerald-700'
                : 'text-slate-700 hover:bg-slate-100')
            }
          >
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <>
          <div className="mx-3 my-2 border-t" />
          <Link
            href="/admin"
            className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Admin →
          </Link>
        </>
      )}
    </nav>
  );
}
