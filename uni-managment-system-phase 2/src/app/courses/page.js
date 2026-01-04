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
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Flex,
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const toast = useToast();

  const formatInstructorName = (instructor) => {
    const first = instructor?.staff?.firstName;
    const last = instructor?.staff?.lastName;
    const full = [first, last].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (instructor?.userCode) return instructor.userCode;
    if (instructor?.email) return instructor.email;
    return 'N/A';
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchTerm, statusFilter, courses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (statusFilter) {
      filtered = filtered.filter((course) => course.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.code.toLowerCase().includes(term) ||
          course.name.toLowerCase().includes(term) ||
          (course.description && course.description.toLowerCase().includes(term))
      );
    }

    setFilteredCourses(filtered);
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading courses...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Course Catalog
        </Heading>

        <HStack spacing={4}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by code, name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search courses"
            />
          </InputGroup>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="200px"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </HStack>

        {filteredCourses.length === 0 ? (
          <Center py={12}>
            <Text color="gray.500" fontSize="lg">
              No courses found.
            </Text>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredCourses.map((course) => (
              <Box
                key={course.id}
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
                      {course.code}
                    </Heading>
                    <Badge
                      colorScheme={course.status === 'ACTIVE' ? 'green' : 'gray'}
                      variant="solid"
                    >
                      {course.status}
                    </Badge>
                  </HStack>
                  <Text fontWeight="medium" color="gray.800">
                    {course.name}
                  </Text>
                  {course.description && (
                    <Text color="gray.600" fontSize="sm" noOfLines={3}>
                      {course.description}
                    </Text>
                  )}
                  <HStack spacing={4} fontSize="sm" color="gray.600">
                    <Text>
                      <strong>Credits:</strong> {course.creditHours}
                    </Text>
                    <Text>
                      <strong>Enrolled:</strong> {course._count?.enrollments || 0}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    <strong>Instructor:</strong> {formatInstructorName(course.instructor)}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        <Text color="gray.500" fontSize="sm">
          Showing {filteredCourses.length} of {courses.length} courses
        </Text>
      </VStack>
    </Box>
  );
}

