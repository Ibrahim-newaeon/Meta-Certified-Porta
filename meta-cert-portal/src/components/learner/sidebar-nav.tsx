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
            aria-current={active ? 'page' : undefined}
            className={
              'inline-flex h-11 items-center rounded-md px-3 text-sm transition-colors ' +
              (active
                ? 'bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand-soft-fg)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--color-text)]')
            }
          >
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <>
          <div className="mx-3 my-2 border-t border-[var(--border)]" />
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-md bg-[var(--color-warn-bg)] px-3 text-sm font-medium text-[var(--color-warn-fg)] transition-colors hover:brightness-95"
          >
            Admin →
          </Link>
        </>
      )}
    </nav>
  );
}
