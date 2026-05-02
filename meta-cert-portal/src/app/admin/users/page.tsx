import { requireRole } from '@/lib/auth/roles';
import {
  InviteUserForm,
  RoleToggle,
  DeleteUserButton,
  PasswordActionsButton,
} from '@/components/admin/users-table-actions';
import { Badge } from '@/components/shared/badge';

export default async function UsersAdminPage() {
  const { user, supabase } = await requireRole('admin');

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">Invite user</h2>
        <InviteUserForm />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">All users</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">
                    {u.email}
                    {u.id === user.id && (
                      <Badge variant="neutral" className="ml-2">you</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">{u.full_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={u.role === 'admin' ? 'warn' : 'neutral'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <RoleToggle
                        userId={u.id}
                        currentRole={u.role as 'admin' | 'learner'}
                        isSelf={u.id === user.id}
                      />
                      <PasswordActionsButton userId={u.id} email={u.email} />
                      <DeleteUserButton
                        userId={u.id}
                        email={u.email}
                        isSelf={u.id === user.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
