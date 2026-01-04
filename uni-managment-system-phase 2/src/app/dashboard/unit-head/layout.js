import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function UnitHeadDashboardLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (currentUser.role !== 'UNIT_HEAD') {
    redirect('/');
  }

  return <>{children}</>;
}

