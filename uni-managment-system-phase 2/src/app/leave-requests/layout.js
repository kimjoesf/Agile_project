import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function LeaveRequestsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Redirect if not staff
  if (
    ![
      'PROFESSOR',
      'TEACHING_ASSISTANT',
      'UNIT_HEAD',
      'STUDENT_AFFAIRS_OFFICER',
      'DEAN',
      'DIRECTOR',
      'ADMIN',
    ].includes(currentUser.role)
  ) {
    redirect('/');
  }

  return <>{children}</>;
}

