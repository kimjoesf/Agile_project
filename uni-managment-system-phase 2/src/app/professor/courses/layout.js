import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function ProfessorCoursesLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Redirect if not professor or TA
  if (!['PROFESSOR', 'TEACHING_ASSISTANT'].includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

