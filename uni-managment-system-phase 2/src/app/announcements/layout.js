import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function AnnouncementsLayout({ children }) {
  const currentUser = await getCurrentUserWithRole();

  // Redirect if not authenticated
  if (!currentUser) {
    redirect('/sign-in');
  }

  return <>{children}</>;
}

