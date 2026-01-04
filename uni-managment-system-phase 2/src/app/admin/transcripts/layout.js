import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function TranscriptsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (currentUser.role !== 'STUDENT_AFFAIRS_OFFICER') {
    redirect('/');
  }

  return <>{children}</>;
}

