import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AdminDashboardLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  return <>{children}</>;
}

