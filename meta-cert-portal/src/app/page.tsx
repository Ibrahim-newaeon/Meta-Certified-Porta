import { redirect } from 'next/navigation';
import { getRole } from '@/lib/auth/roles';

export default async function Home() {
  const role = await getRole();
  if (!role) redirect('/login');
  if (role === 'admin') redirect('/admin');
  redirect('/dashboard');
}
