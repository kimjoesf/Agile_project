import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AdmissionsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!['STUDENT_AFFAIRS_OFFICER', 'DEAN', 'DIRECTOR'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}
