import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/libs/auth';

export default async function Home() {
  const currentUser = await getCurrentUserWithRole();

  if (currentUser) {
    redirect('/dashboard');
  }

  redirect('/sign-in');
}
