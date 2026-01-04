import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function GradesLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  // Allow students, professors, and TAs
  const allowedRoles = ['STUDENT', 'PROFESSOR', 'TEACHING_ASSISTANT'];
  if (!allowedRoles.includes(currentUser.role)) {
    redirect('/');
  }

  return <>{children}</>;
}

