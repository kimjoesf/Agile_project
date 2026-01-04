'use client';

import {
  Box,
  VStack,
  Heading,
  SimpleGrid,
  Text,
  HStack,
} from '@chakra-ui/react';
import Link from 'next/link';

// Simple icon component
const NavIcon = ({ name, color }) => {
  const iconMap = {book: '📚',enroll: '🎓',room: '🏠', grade: '📊', bell: '🔔',chat: '💬',course: '📖',request: '📝',user: '👥', check: '✅', calendar: '📅', settings: '⚙️'};
  return <Text fontSize="2xl">{iconMap[name] || '📄'}</Text>;
};

const navigationItems = [
  {
    title: 'Course Catalog',
    description: 'Browse available courses',
    icon: 'book',
    href: '/courses',
    color: 'blue',
  },
  {
    title: 'My Enrollments',
    description: 'View and manage course enrollments',
    icon: 'enroll',
    href: '/student/enroll',
    color: 'green',
  },
  {
    title: 'Assigned Rooms',
    description: 'View rooms for your courses',
    icon: 'room',
    href: '/student/rooms',
    color: 'purple',
  },
  {
    title: 'My Grades',
    description: 'View your grades and feedback',
    icon: 'grade',
    href: '/grades',
    color: 'orange',
  },
  {
    title: 'Announcements',
    description: 'View university and course announcements',
    icon: 'bell',
    href: '/announcements',
    color: 'yellow',
  },
  {
    title: 'Messages',
    description: 'Send and receive messages',
    icon: 'chat',
    href: '/messages',
    color: 'teal',
  },
];

export default function StudentDashboard() {
  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Student Dashboard
        </Heading>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <Box
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="sm"
                _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                h="100%"
                bg="white"
              >
                <VStack align="start" spacing={3}>
                  <HStack>
                    <NavIcon name={item.icon} color={item.color} />
                    <Heading size="md" color="gray.700">
                      {item.title}
                    </Heading>
                  </HStack>
                  <Text color="gray.600" fontSize="sm">
                    {item.description}
                  </Text>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

