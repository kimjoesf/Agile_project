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
  const iconMap = {
    book: '📚',
    course: '📖',
    room: '🏠',
    grade: '📊',
    bell: '🔔',
    chat: '💬',
    request: '📝',
    user: '👥',
    check: '✅',
    calendar: '📅',
    settings: '⚙️',
  };
  return <Text fontSize="2xl">{iconMap[name] || '📄'}</Text>;
};

const navigationItems = [
  {
    title: 'My Courses',
    description: 'Manage courses, assignments, and quizzes',
    icon: 'course',
    href: '/professor/courses',
    color: 'blue',
  },
  {
    title: 'Room Requests',
    description: 'Request and manage room bookings',
    icon: 'room',
    href: '/professor/rooms',
    color: 'green',
  },
  {
    title: 'Leave Requests',
    description: 'Submit and track your leave requests',
    icon: 'calendar',
    href: '/leave-requests',
    color: 'purple',
  },
  {
    title: 'Grades',
    description: 'Grade assignments and quizzes',
    icon: 'grade',
    href: '/grades',
    color: 'orange',
  },
  {
    title: 'Announcements',
    description: 'View and create announcements',
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

export default function ProfessorDashboard() {
  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
           Dashboard
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

