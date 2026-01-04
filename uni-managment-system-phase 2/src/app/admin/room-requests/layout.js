import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AdminRoomRequestsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Redirect if not admin, unit head, dean, or director
  if (!['ADMIN', 'UNIT_HEAD', 'DEAN', 'DIRECTOR'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

