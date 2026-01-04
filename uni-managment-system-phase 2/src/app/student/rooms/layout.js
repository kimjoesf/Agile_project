import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function StudentRoomsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Redirect if not student
  if (currentUser.role !== 'STUDENT') {
    redirect('/');
  }

  return <>{children}</>;
}

