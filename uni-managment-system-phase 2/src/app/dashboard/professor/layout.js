import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function ProfessorDashboardLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!['PROFESSOR', 'TEACHING_ASSISTANT'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

