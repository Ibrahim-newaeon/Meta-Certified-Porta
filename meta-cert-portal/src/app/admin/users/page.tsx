import { requireRole } from '@/lib/auth/roles';
import { InviteUserForm, RoleToggle } from '@/components/admin/users-table-actions';

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
        <h2 className="mb-2 text-sm font-medium text-slate-700">Invite user</h2>
        <InviteUserForm />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">All users</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">
                    {u.email}
                    {u.id === user.id && (
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">you</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{u.full_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RoleToggle
                      userId={u.id}
                      currentRole={u.role as 'admin' | 'learner'}
                      isSelf={u.id === user.id}
                    />
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
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
