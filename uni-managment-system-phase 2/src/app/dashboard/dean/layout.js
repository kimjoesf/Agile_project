import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function DeanDashboardLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!['DEAN', 'DIRECTOR'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

