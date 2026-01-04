'use client';

import { SignIn } from '@clerk/nextjs';
import {
  Box,
  VStack,
  Heading,
  Text,
  Center,
  Container,
} from '@chakra-ui/react';

export default function SignInPage() {

  return (
    <Center minH="100vh" bg="gray.50" py={8}>
      <Container maxW="md" w="full">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Heading size="xl" color="gray.700" mb={2}>
              University Management System
            </Heading>
            <Text color="gray.600" fontSize="md">
              Sign in to your account
            </Text>
          </Box>

          {/* Clerk Sign-In Component */}
          <Box
            bg="white"
            p={8}
            borderRadius="lg"
            boxShadow="sm"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <SignIn
              routing="path"
              path="/sign-in"
              afterSignInUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: {
                    width: '100%',
                  },
                  card: {
                    boxShadow: 'none',
                    border: 'none',
                    padding: 0,
                  },
                  headerTitle: {
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#2D3748',
                  },
                  headerSubtitle: {
                    fontSize: '0.875rem',
                    color: '#718096',
                  },
                  socialButtonsBlockButton: {
                    borderRadius: '0.375rem',
                    borderColor: '#E2E8F0',
                    '&:hover': {
                      backgroundColor: '#F7FAFC',
                    },
                  },
                  formButtonPrimary: {
                    backgroundColor: '#3182CE',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    '&:hover': {
                      backgroundColor: '#2C5282',
                    },
                  },
                  formFieldInput: {
                    borderRadius: '0.375rem',
                    borderColor: '#E2E8F0',
                    fontSize: '0.875rem',
                    '&:focus': {
                      borderColor: '#3182CE',
                      boxShadow: '0 0 0 1px #3182CE',
                    },
                  },
                  footerActionLink: {
                    color: '#3182CE',
                    '&:hover': {
                      color: '#2C5282',
                    },
                  },
                  identityPreviewText: {
                    color: '#2D3748',
                  },
                  identityPreviewEditButton: {
                    color: '#3182CE',
                  },
                },
              }}
            />
          </Box>

          {/* Footer */}
          <Text textAlign="center" fontSize="sm" color="gray.500">
            Don't have an account?{' '}
            <Text
              as="a"
              href="/sign-up"
              color="blue.500"
              fontWeight="medium"
              _hover={{ color: 'blue.600', textDecoration: 'underline' }}
            >
              Sign up
            </Text>
          </Text>
        </VStack>
      </Container>
    </Center>
  );
}

