import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AdminRoomsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Redirect if not admin or unit head
  if (!['ADMIN', 'UNIT_HEAD'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

