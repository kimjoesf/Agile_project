'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FaEdit, FaPlus, FaSearch } from 'react-icons/fa';

const COURSE_STATUS_COLORS = {
  ACTIVE: 'green',
  ARCHIVED: 'gray',
};

const formatInstructorName = (instructor) => {
  const first = instructor?.staff?.firstName;
  const last = instructor?.staff?.lastName;
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (instructor?.userCode) return instructor.userCode;
  if (instructor?.email) return instructor.email;
  return 'N/A';
};

const formatTAName = (ta) => {
  if (!ta) return '—';
  return formatInstructorName(ta);
};

export default function AdminCoursesPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const [staffLoading, setStaffLoading] = useState(true);
  const [staff, setStaff] = useState([]);

  const createModal = useDisclosure();
  const editModal = useDisclosure();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    description: '',
    creditHours: '',
    instructorId: '',
    teachingAssistantId: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchCourses();
    fetchStaff();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch courses');
      }
      setCourses(data.courses || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load courses.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const response = await fetch('/api/staff');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff');
      }
      setStaff(data.staff || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load staff list.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setStaffLoading(false);
    }
  };

  const instructorOptions = useMemo(() => {
    return (staff || []).filter((s) =>
      ['PROFESSOR', 'TEACHING_ASSISTANT'].includes(s?.user?.role)
    );
  }, [staff]);

  const teachingAssistantOptions = useMemo(() => {
    return (staff || []).filter((s) => s?.user?.role === 'TEACHING_ASSISTANT');
  }, [staff]);

  const filteredCourses = useMemo(() => {
    let filtered = courses;

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.code || '').toLowerCase().includes(term) ||
          (c.name || '').toLowerCase().includes(term) ||
          (c.description || '').toLowerCase().includes(term) ||
          (c.instructor?.email || '').toLowerCase().includes(term) ||
          (c.instructor?.userCode || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [courses, searchTerm, statusFilter]);

  const openCreate = () => {
    setSelectedCourse(null);
    setCourseForm({
      code: '',
      name: '',
      description: '',
      creditHours: '',
      instructorId: '',
      teachingAssistantId: '',
      status: 'ACTIVE',
    });
    createModal.onOpen();
  };

  const openEdit = (course) => {
    setSelectedCourse(course);
    setCourseForm({
      code: course.code || '',
      name: course.name || '',
      description: course.description || '',
      creditHours: course.creditHours?.toString() || '',
      instructorId: course.instructorId || course.instructor?.id || '',
      teachingAssistantId: course.teachingAssistantId || course.teachingAssistant?.id || '',
      status: course.status || 'ACTIVE',
    });
    editModal.onOpen();
  };

  const handleCreate = async () => {
    try {
      if (!courseForm.code || !courseForm.name || !courseForm.creditHours || !courseForm.instructorId) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: courseForm.code,
          name: courseForm.name,
          description: courseForm.description || null,
          creditHours: courseForm.creditHours,
          instructorId: courseForm.instructorId,
          teachingAssistantId: courseForm.teachingAssistantId || null,
          status: courseForm.status,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create course');
      }

      toast({
        title: 'Success',
        description: 'Course created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      await fetchCourses();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create course.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedCourse) return;

    try {
      if (!courseForm.name || !courseForm.creditHours || !courseForm.instructorId) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: courseForm.name,
          description: courseForm.description || null,
          creditHours: courseForm.creditHours,
          instructorId: courseForm.instructorId,
          teachingAssistantId: courseForm.teachingAssistantId || null,
          status: courseForm.status,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update course');
      }

      toast({
        title: 'Success',
        description: 'Course updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      editModal.onClose();
      setSelectedCourse(null);
      await fetchCourses();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update course.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
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
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Course Management
          </Heading>
          <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={openCreate}>
            Create Course
          </Button>
        </Flex>

        <HStack spacing={4}>
          <InputGroup maxW="420px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by code, name, instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search courses"
            />
          </InputGroup>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="220px"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </HStack>

        <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto" boxShadow="sm">
          <Table variant="simple" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Instructor</Th>
                <Th>TA</Th>
                <Th isNumeric>Credits</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCourses.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">No courses found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredCourses.map((course) => (
                  <Tr key={course.id} _hover={{ bg: 'gray.50' }} transition="background-color 0.2s">
                    <Td fontWeight="medium">{course.code}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {course.name}
                        </Text>
                        {course.description ? (
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>
                            {course.description}
                          </Text>
                        ) : null}
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm">{formatInstructorName(course.instructor)}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {course.instructor?.userCode || ''}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm">{formatTAName(course.teachingAssistant)}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {course.teachingAssistant?.userCode || ''}
                        </Text>
                      </VStack>
                    </Td>
                    <Td isNumeric>{course.creditHours}</Td>
                    <Td>
                      <Badge colorScheme={COURSE_STATUS_COLORS[course.status] || 'gray'} variant="solid">
                        {course.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="Edit">
                          <IconButton
                            icon={<FaEdit />}
                            size="sm"
                            variant="outline"
                            aria-label={`Edit ${course.code}`}
                            onClick={() => openEdit(course)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Text color="gray.500" fontSize="sm">
          Showing {filteredCourses.length} of {courses.length} courses
        </Text>
      </VStack>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} size="lg" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Course</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Course Code</FormLabel>
                <Input
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  placeholder="e.g. CS101"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Course Name</FormLabel>
                <Input
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Introduction to Computer Science"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>

              <HStack spacing={4} align="start">
                <FormControl isRequired>
                  <FormLabel>Credit Hours</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={courseForm.creditHours}
                    onChange={(e) => setCourseForm({ ...courseForm, creditHours: e.target.value })}
                    placeholder="e.g. 3"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={courseForm.status}
                    onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl isRequired isDisabled={staffLoading}>
                <FormLabel>Instructor</FormLabel>
                <Select
                  value={courseForm.instructorId}
                  onChange={(e) => setCourseForm({ ...courseForm, instructorId: e.target.value })}
                  placeholder={staffLoading ? 'Loading instructors...' : 'Select instructor'}
                >
                  {instructorOptions.map((s) => (
                    <option key={s.user.id} value={s.user.id}>
                      {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.user.email} ({s.user.userCode})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isDisabled={staffLoading}>
                <FormLabel>Teaching Assistant (Optional)</FormLabel>
                <Select
                  value={courseForm.teachingAssistantId}
                  onChange={(e) => setCourseForm({ ...courseForm, teachingAssistantId: e.target.value })}
                  placeholder={staffLoading ? 'Loading teaching assistants...' : 'Select teaching assistant (optional)'}
                >
                  {teachingAssistantOptions.map((s) => (
                    <option key={s.user.id} value={s.user.id}>
                      {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.user.email} ({s.user.userCode})
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreate}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} size="lg" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Edit Course</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isDisabled>
                <FormLabel>Course Code</FormLabel>
                <Input value={courseForm.code} isDisabled />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Course Name</FormLabel>
                <Input
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>

              <HStack spacing={4} align="start">
                <FormControl isRequired>
                  <FormLabel>Credit Hours</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={courseForm.creditHours}
                    onChange={(e) => setCourseForm({ ...courseForm, creditHours: e.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={courseForm.status}
                    onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl isRequired isDisabled={staffLoading}>
                <FormLabel>Instructor</FormLabel>
                <Select
                  value={courseForm.instructorId}
                  onChange={(e) => setCourseForm({ ...courseForm, instructorId: e.target.value })}
                  placeholder={staffLoading ? 'Loading instructors...' : 'Select instructor'}
                >
                  {instructorOptions.map((s) => (
                    <option key={s.user.id} value={s.user.id}>
                      {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.user.email} ({s.user.userCode})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isDisabled={staffLoading}>
                <FormLabel>Teaching Assistant (Optional)</FormLabel>
                <Select
                  value={courseForm.teachingAssistantId}
                  onChange={(e) => setCourseForm({ ...courseForm, teachingAssistantId: e.target.value })}
                  placeholder={staffLoading ? 'Loading teaching assistants...' : 'Select teaching assistant (optional)'}
                >
                  {teachingAssistantOptions.map((s) => (
                    <option key={s.user.id} value={s.user.id}>
                      {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.user.email} ({s.user.userCode})
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdate}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
