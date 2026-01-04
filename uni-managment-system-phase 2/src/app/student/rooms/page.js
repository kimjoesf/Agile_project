'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Spinner,
  Center,
  Text,
  Badge,
  HStack,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';

export default function StudentRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      // Note: In a full implementation, this would filter by enrolled courses
      // For now, showing all available rooms
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRoomType = (type) => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (value) => {
    const d = new Date(value);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (value) => {
    const d = new Date(value);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getDurationMinutes = (start, end) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
    const mins = Math.round((e - s) / 60000);
    return mins > 0 ? mins : null;
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading rooms...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Assigned Rooms
        </Heading>

        {rooms.length === 0 ? (
          <Center py={12}>
            <Text color="gray.500" fontSize="lg">
              No rooms assigned to your courses.
            </Text>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {rooms.map((room) => (
              <Box
                key={room.id}
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="sm"
                _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                bg="white"
              >
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">
                      {room.name}
                    </Heading>
                    <Badge
                      colorScheme={room.status === 'AVAILABLE' ? 'green' : 'red'}
                      variant="solid"
                    >
                      {room.status}
                    </Badge>
                  </HStack>
                  <Text color="gray.600" fontSize="sm">
                    <strong>Type:</strong> {formatRoomType(room.type)}
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    <strong>Location:</strong> {room.location}
                  </Text>
                  {room.capacity && (
                    <Text color="gray.600" fontSize="sm">
                      <strong>Capacity:</strong> {room.capacity}
                    </Text>
                  )}
                  {room.description && (
                    <Text color="gray.500" fontSize="sm" noOfLines={2}>
                      {room.description}
                    </Text>
                  )}

                  {Array.isArray(room.schedule) && room.schedule.length > 0 ? (
                    <Box pt={2} borderTopWidth="1px" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                        Upcoming Schedule
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        {room.schedule.slice(0, 5).map((s) => {
                          const duration = getDurationMinutes(s.startTime, s.endTime);
                          return (
                            <Box key={s.id} borderWidth="1px" borderRadius="md" p={2} bg="gray.50">
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text fontSize="sm" color="gray.700" fontWeight="medium">
                                    {formatDate(s.date)}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {formatTime(s.startTime)} - {formatTime(s.endTime)}
                                    {duration ? ` (${duration} min)` : ''}
                                  </Text>
                                  {Array.isArray(s.courses) && s.courses.length > 0 ? (
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                      Courses: {s.courses.map((c) => c.code).join(', ')}
                                    </Text>
                                  ) : null}
                                </Box>
                                <Badge colorScheme={s.status === 'ACTIVE' ? 'green' : 'gray'} variant="subtle">
                                  {s.status}
                                </Badge>
                              </HStack>
                            </Box>
                          );
                        })}
                      </VStack>
                    </Box>
                  ) : null}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Box>
  );
}

