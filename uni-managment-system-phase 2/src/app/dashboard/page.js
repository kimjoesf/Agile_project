import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import {
  Box,
  VStack,
  Heading,
  Text,
  Center,
  Container,
  Link,
} from '@chakra-ui/react';

export default async function DashboardPage() {
  // First check if user is authenticated with Clerk
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Then check if user exists in database
  const currentUser = await getCurrentUserWithRole();

  // If user is authenticated with Clerk but doesn't exist in database,
  // they need to complete registration or wait for admin to create their account
  // Instead of redirecting (which causes a loop), we'll show an error page
  if (!currentUser) {
    // Create a simple error response instead of redirecting
    // This prevents the redirect loop
    return (
      <Center minH="100vh" bg="gray.50" py={8}>
        <Container maxW="md" w="full">
          <VStack spacing={6} align="stretch" textAlign="center">
            <Box
              bg="white"
              p={8}
              borderRadius="lg"
              boxShadow="sm"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <VStack spacing={4}>
                <Heading size="lg" color="gray.700">
                  Account Setup Required
                </Heading>
                <Text color="gray.600" fontSize="md">
                  Your account has been authenticated, but it hasn't been set up in the system yet. 
                  Please contact an administrator to complete your account setup.
                </Text>
                <Link
                  href="/sign-in"
                  color="blue.500"
                  fontWeight="medium"
                  _hover={{ color: 'blue.600', textDecoration: 'underline' }}
                >
                  Return to Sign In
                </Link>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Center>
    );
  }

  // Redirect to role-specific dashboard
  const role = currentUser.role;

  if (role === 'STUDENT') {
    redirect('/dashboard/student');
  } else if (['PROFESSOR', 'TEACHING_ASSISTANT'].includes(role)) {
    redirect('/dashboard/professor');
  } else if (role === 'UNIT_HEAD') {
    redirect('/dashboard/unit-head');
  } else if (['DEAN', 'DIRECTOR'].includes(role)) {
    redirect('/dashboard/dean');
  } else if (role === 'ADMIN') {
    redirect('/dashboard/admin');
  } else if (role === 'STUDENT_AFFAIRS_OFFICER') {
    redirect('/dashboard/student-affairs');
  }

  redirect('/');
}

