import { getCurrentUserWithRole } from '@/libs/auth';
import AdmissionsPageClient from './pageClient';

export default async function AdmissionsPage() {
  const currentUser = await getCurrentUserWithRole();

  return (
    <AdmissionsPageClient
      currentUser={{
        id: currentUser?.id,
        email: currentUser?.email,
        role: currentUser?.role,
        userCode: currentUser?.userCode,
      }}
    />
  );
}
