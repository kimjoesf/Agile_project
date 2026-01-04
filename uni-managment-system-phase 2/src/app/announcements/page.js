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
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Button,
  Flex,
  Divider,
} from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isloading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const toast = useToast();

  // Modal
  const createModal = useDisclosure();
  const [announcementForm, setAnnouncementForm] = useState({
    type: '',
    title: '',
    content: '',
    courseId: '',
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchAnnouncements();
    fetchCourses();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [typeFilter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const url = typeFilter ? `/api/announcements?type=${typeFilter}` : '/api/announcements';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.type || !announcementForm.title || !announcementForm.content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (announcementForm.type === 'COURSE' && !announcementForm.courseId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a course for course announcements.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (isloading) return;
    try {
      setIsLoading(true);
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...announcementForm,
          courseId: announcementForm.type === 'COURSE' ? announcementForm.courseId : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create announcement');
      }

      toast({
        title: 'Success',
        description: 'Announcement created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setAnnouncementForm({ type: '', title: '', content: '', courseId: '' });
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create announcement.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }finally{
      setIsLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'UNIVERSITY':
        return 'blue';
      case 'COURSE':
        return 'green';
      case 'DEPARTMENT':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading announcements...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Announcements
          </Heading>
          <HStack spacing={4}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              maxW="200px"
              placeholder="Filter by type"
              aria-label="Filter announcements"
            >
              <option value="">All Types</option>
              <option value="UNIVERSITY">University</option>
              <option value="COURSE">Course</option>
              <option value="DEPARTMENT">Department</option>
            </Select>
            {currentUser && ['ADMIN', 'DEAN', 'DIRECTOR'].includes(currentUser.role) && (
              <Button
                width={"270px"}
                leftIcon={<FaPlus />}
                colorScheme="blue"
                onClick={createModal.onOpen}
                aria-label="Create announcement"
              >
                Create Announcement
              </Button>
            )}
          </HStack>
        </Flex>

        {announcements.length === 0 ? (
          <Center py={12}>
            <Text color="gray.500" fontSize="lg">
              No announcements found.
            </Text>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {announcements.map((announcement) => (
              <Box
                key={announcement.id}
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="sm"
                _hover={{ boxShadow: 'md' }}
                transition="all 0.2s"
                bg="white"
              >
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Badge
                      colorScheme={getTypeColor(announcement.type)}
                      variant="solid"
                    >
                      {announcement.type}
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                  <Heading size="md" color="gray.700">
                    {announcement.title}
                  </Heading>
                  {announcement.course && (
                    <Text fontSize="sm" color="gray.600">
                      <strong>Course:</strong> {announcement.course.code} - {announcement.course.name}
                    </Text>
                  )}
                  <Text color="gray.700" whiteSpace="pre-wrap">
                    {announcement.content}
                  </Text>
                  <Divider />
                  <Text fontSize="xs" color="gray.500">
                    By {announcement.author.email}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        size="lg"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Announcement</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={announcementForm.type}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, type: e.target.value, courseId: '' })
                  }
                  aria-label="Announcement type"
                >
                  <option value="">Select type</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="COURSE">Course</option>
                  <option value="DEPARTMENT">Department</option>
                </Select>
              </FormControl>
              {announcementForm.type === 'COURSE' && (
                <FormControl isRequired>
                  <FormLabel>Course</FormLabel>
                  <Select
                    value={announcementForm.courseId}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, courseId: e.target.value })
                    }
                    placeholder="Select course"
                    aria-label="Select course"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                  aria-label="Announcement title"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Content</FormLabel>
                <Textarea
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, content: e.target.value })
                  }
                  minH="150px"
                  aria-label="Announcement content"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateAnnouncement}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

