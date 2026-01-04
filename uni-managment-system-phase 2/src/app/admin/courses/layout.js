import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AdminCoursesLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!['ADMIN', 'UNIT_HEAD', 'DIRECTOR'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}
