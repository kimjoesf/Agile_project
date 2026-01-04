'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useDisclosure,
  useToast,
  Spinner,
  Center,
  Badge,
  HStack,
  VStack,
  Heading,
  InputGroup,
  InputLeftElement,
  Flex,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';

export default function StudentEnrollPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialsCourse, setMaterialsCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const materialsModal = useDisclosure();

  const workModal = useDisclosure();
  const [workCourse, setWorkCourse] = useState(null);
  const [workLoading, setWorkLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
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
    fetchEnrollments();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses?status=ACTIVE');
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

  const openCourseWork = async (course) => {
    try {
      setWorkCourse(course);
      setAssignments([]);
      setQuizzes([]);
      setExams([]);
      setSubmissions([]);
      setSelectedFiles({});
      setWorkLoading(true);
      workModal.onOpen();

      const [aRes, qRes, eRes, sRes] = await Promise.all([
        fetch(`/api/assignments?courseId=${course.id}`),
        fetch(`/api/quizzes?courseId=${course.id}`),
        fetch(`/api/exams?courseId=${course.id}`),
        fetch(`/api/submissions?courseId=${course.id}`),
      ]);

      const [aData, qData, eData, sData] = await Promise.all([
        aRes.json(),
        qRes.json(),
        eRes.json(),
        sRes.json(),
      ]);

      if (!aRes.ok) throw new Error(aData.error || 'Failed to load assignments');
      if (!qRes.ok) throw new Error(qData.error || 'Failed to load quizzes');
      if (!eRes.ok) throw new Error(eData.error || 'Failed to load exams');
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load submissions');

      setAssignments(aData.assignments || []);
      setQuizzes(qData.quizzes || []);
      setExams(eData.exams || []);
      setSubmissions(sData.submissions || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load course work.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setWorkLoading(false);
    }
  };

  const getSubmissionForItem = (type, id) => {
    if (!id) return null;
    if (type === 'ASSIGNMENT') return submissions.find((s) => s.type === 'ASSIGNMENT' && s.assignmentId === id);
    if (type === 'QUIZ') return submissions.find((s) => s.type === 'QUIZ' && s.quizId === id);
    if (type === 'EXAM') return submissions.find((s) => s.type === 'EXAM' && s.examId === id);
    return null;
  };

  const handleFileChange = (key, file) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: file || null }));
  };

  const submitWork = async ({ type, assignmentId, quizId, examId }) => {
    const key = `${type}:${assignmentId || quizId || examId}`;
    const file = selectedFiles[key];
    if (!file) {
      toast({
        title: 'File required',
        description: 'Please choose a file to submit.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('type', type);
      if (assignmentId) formData.append('assignmentId', assignmentId);
      if (quizId) formData.append('quizId', quizId);
      if (examId) formData.append('examId', examId);
      formData.append('file', file);

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');

      toast({
        title: 'Submitted',
        description: 'Your submission was uploaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (workCourse?.id) {
        const sRes = await fetch(`/api/submissions?courseId=${workCourse.id}`);
        const sData = await sRes.json();
        if (sRes.ok) setSubmissions(sData.submissions || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openMaterials = async (course) => {
    try {
      setMaterialsCourse(course);
      setMaterials([]);
      setMaterialsLoading(true);
      materialsModal.onOpen();

      const response = await fetch(`/api/courses/${course.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load materials');
      }

      setMaterials(data.course?.materials || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load course materials.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setMaterialsLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      setEnrollmentsLoading(true);
      const response = await fetch('/api/enrollments?status=ACTIVE');
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      const data = await response.json();
      setEnrollments(data.enrollments || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollments.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll');
      }

      toast({
        title: 'Success',
        description: 'Successfully enrolled in course.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchEnrollments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll in course.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        course.code.toLowerCase().includes(term) ||
        course.name.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const availableCourses = filteredCourses.filter((c) => !enrolledCourseIds.has(c.id));

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Course Enrollment
        </Heading>

        <Tabs>
          <TabList>
            <Tab>Available Courses</Tab>
            <Tab>My Enrollments</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <InputGroup maxW="400px" mb={4}>
                <InputLeftElement pointerEvents="none">
                  <FaSearch color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search courses"
                />
              </InputGroup>

              <TableContainer
                borderWidth="1px"
                borderRadius="lg"
                overflowX="auto"
                boxShadow="sm"
              >
                <Table variant="simple" size="md">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Code</Th>
                      <Th>Name</Th>
                      <Th>Credits</Th>
                      <Th>Instructor</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {availableCourses.length === 0 ? (
                      <Tr>
                        <Td colSpan={5} textAlign="center" py={8}>
                          <Text color="gray.500">No available courses found</Text>
                        </Td>
                      </Tr>
                    ) : (
                      availableCourses.map((course) => (
                        <Tr
                          key={course.id}
                          _hover={{ bg: 'gray.50' }}
                          transition="background-color 0.2s"
                        >
                          <Td fontWeight="medium">{course.code}</Td>
                          <Td>{course.name}</Td>
                          <Td>{course.creditHours}</Td>
                          <Td>{formatInstructorName(course.instructor)}</Td>
                          <Td>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handleEnroll(course.id)}
                            >
                              Enroll
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel px={0}>
              {enrollmentsLoading ? (
                <Center py={8}>
                  <Spinner size="lg" color="blue.500" />
                </Center>
              ) : (
                <TableContainer
                  borderWidth="1px"
                  borderRadius="lg"
                  overflowX="auto"
                  boxShadow="sm"
                >
                  <Table variant="simple" size="md">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Code</Th>
                        <Th>Course Name</Th>
                        <Th>Credits</Th>
                        <Th>Instructor</Th>
                        <Th>Enrolled Date</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {enrollments.length === 0 ? (
                        <Tr>
                          <Td colSpan={7} textAlign="center" py={8}>
                            <Text color="gray.500">No enrollments found</Text>
                          </Td>
                        </Tr>
                      ) : (
                        enrollments.map((enrollment) => (
                          <Tr
                            key={enrollment.id}
                            _hover={{ bg: 'gray.50' }}
                            transition="background-color 0.2s"
                          >
                            <Td fontWeight="medium">{enrollment.course.code}</Td>
                            <Td>{enrollment.course.name}</Td>
                            <Td>{enrollment.course.creditHours}</Td>
                            <Td>{formatInstructorName(enrollment.course.instructor)}</Td>
                            <Td>
                              {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </Td>
                            <Td>
                              <Badge colorScheme="green" variant="solid">
                                {enrollment.status}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => openMaterials(enrollment.course)}
                                >
                                  View Materials
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={() => openCourseWork(enrollment.course)}
                                >
                                  Course Work
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      <Modal isOpen={materialsModal.isOpen} onClose={materialsModal.onClose} size="lg">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>
            Materials{materialsCourse ? `: ${materialsCourse.code}` : ''}
          </ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {materialsLoading ? (
              <Center py={8}>
                <Spinner size="lg" color="blue.500" />
              </Center>
            ) : materials.length === 0 ? (
              <Text color="gray.500">No materials uploaded for this course.</Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {materials.map((m, idx) => (
                  <Box key={`${m.url || m.filename || 'material'}-${idx}`} borderWidth="1px" borderRadius="md" p={3}>
                    <HStack justify="space-between" align="start">
                      <Box>
                        <Text fontWeight="semibold">{m.filename || 'Material'}</Text>
                        <Text color="gray.600" fontSize="sm">
                          {m.description || '—'}
                        </Text>
                        {m.uploadedAt ? (
                          <Text color="gray.500" fontSize="xs" mt={1}>
                            {new Date(m.uploadedAt).toLocaleString()}
                          </Text>
                        ) : null}
                      </Box>
                      {m.url ? (
                        <Link href={m.url} isExternal color="blue.600" fontWeight="medium">
                          Open
                        </Link>
                      ) : null}
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={materialsModal.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={workModal.isOpen} onClose={workModal.onClose} size="xl">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>
            Course Work{workCourse ? `: ${workCourse.code}` : ''}
          </ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {workLoading ? (
              <Center py={8}>
                <Spinner size="lg" color="blue.500" />
              </Center>
            ) : (
              <Tabs>
                <TabList>
                  <Tab>Assignments</Tab>
                  <Tab>Quizzes</Tab>
                  <Tab>Exams</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={4} mt={4}>
                      {assignments.length === 0 ? (
                        <Text color="gray.500">No assignments for this course.</Text>
                      ) : (
                        assignments.map((a) => {
                          const submission = getSubmissionForItem('ASSIGNMENT', a.id);
                          const key = `ASSIGNMENT:${a.id}`;
                          return (
                            <Box key={a.id} borderWidth="1px" borderRadius="lg" p={4}>
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text fontWeight="semibold">{a.title}</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Deadline: {a.deadline ? new Date(a.deadline).toLocaleString() : '—'}
                                  </Text>
                                  {a.description ? (
                                    <Text fontSize="sm" color="gray.700" mt={2} whiteSpace="pre-wrap">
                                      {a.description}
                                    </Text>
                                  ) : null}
                                  {submission ? (
                                    <HStack spacing={3} mt={2}>
                                      <Badge colorScheme={submission.status === 'GRADED' ? 'green' : 'blue'}>
                                        {submission.status}
                                      </Badge>
                                      {submission.fileUrl ? (
                                        <Link href={submission.fileUrl} isExternal color="blue.600" fontWeight="medium">
                                          Download ({submission.fileName || 'file'})
                                        </Link>
                                      ) : null}
                                      {submission.submittedAt ? (
                                        <Text fontSize="xs" color="gray.500">
                                          {new Date(submission.submittedAt).toLocaleString()}
                                        </Text>
                                      ) : null}
                                    </HStack>
                                  ) : (
                                    <Text fontSize="sm" color="gray.500" mt={2}>
                                      Not submitted yet.
                                    </Text>
                                  )}
                                </Box>
                              </HStack>

                              <Box mt={4}>
                                <FormControl>
                                  <FormLabel fontSize="sm">Upload submission</FormLabel>
                                  <Input
                                    type="file"
                                    onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                                  />
                                </FormControl>
                                <Button
                                  mt={3}
                                  colorScheme="blue"
                                  onClick={() => submitWork({ type: 'ASSIGNMENT', assignmentId: a.id })}
                                >
                                  {submission ? 'Resubmit' : 'Submit'}
                                </Button>
                              </Box>
                            </Box>
                          );
                        })
                      )}
                    </VStack>
                  </TabPanel>

                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={4} mt={4}>
                      {quizzes.length === 0 ? (
                        <Text color="gray.500">No quizzes for this course.</Text>
                      ) : (
                        quizzes.map((q) => {
                          const submission = getSubmissionForItem('QUIZ', q.id);
                          const key = `QUIZ:${q.id}`;
                          return (
                            <Box key={q.id} borderWidth="1px" borderRadius="lg" p={4}>
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text fontWeight="semibold">{q.title}</Text>
                                  {q.description ? (
                                    <Text fontSize="sm" color="gray.700" mt={2} whiteSpace="pre-wrap">
                                      {q.description}
                                    </Text>
                                  ) : null}
                                  {Array.isArray(q.questions) && q.questions.length > 0 ? (
                                    <Box mt={3}>
                                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                        Questions
                                      </Text>
                                      <VStack align="stretch" spacing={2} mt={2}>
                                        {q.questions.map((question, idx) => {
                                          const text =
                                            typeof question === 'string'
                                              ? question
                                              : question?.question || question?.text || JSON.stringify(question);
                                          return (
                                            <Box
                                              key={idx}
                                              p={2}
                                              borderWidth="1px"
                                              borderRadius="md"
                                              bg="gray.50"
                                            >
                                              <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                                                {idx + 1}. {text}
                                              </Text>
                                            </Box>
                                          );
                                        })}
                                      </VStack>
                                    </Box>
                                  ) : null}
                                  {submission ? (
                                    <HStack spacing={3} mt={2}>
                                      <Badge colorScheme={submission.status === 'GRADED' ? 'green' : 'blue'}>
                                        {submission.status}
                                      </Badge>
                                      {submission.fileUrl ? (
                                        <Link href={submission.fileUrl} isExternal color="blue.600" fontWeight="medium">
                                          Download ({submission.fileName || 'file'})
                                        </Link>
                                      ) : null}
                                      {submission.submittedAt ? (
                                        <Text fontSize="xs" color="gray.500">
                                          {new Date(submission.submittedAt).toLocaleString()}
                                        </Text>
                                      ) : null}
                                    </HStack>
                                  ) : (
                                    <Text fontSize="sm" color="gray.500" mt={2}>
                                      Not submitted yet.
                                    </Text>
                                  )}
                                </Box>
                              </HStack>

                              <Box mt={4}>
                                <FormControl>
                                  <FormLabel fontSize="sm">Upload submission</FormLabel>
                                  <Input
                                    type="file"
                                    onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                                  />
                                </FormControl>
                                <Button
                                  mt={3}
                                  colorScheme="blue"
                                  onClick={() => submitWork({ type: 'QUIZ', quizId: q.id })}
                                >
                                  {submission ? 'Resubmit' : 'Submit'}
                                </Button>
                              </Box>
                            </Box>
                          );
                        })
                      )}
                    </VStack>
                  </TabPanel>

                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={4} mt={4}>
                      {exams.length === 0 ? (
                        <Text color="gray.500">No exams for this course.</Text>
                      ) : (
                        exams.map((ex) => {
                          const submission = getSubmissionForItem('EXAM', ex.id);
                          const key = `EXAM:${ex.id}`;
                          return (
                            <Box key={ex.id} borderWidth="1px" borderRadius="lg" p={4}>
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text fontWeight="semibold">{ex.title}</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Date: {ex.date ? new Date(ex.date).toLocaleString() : '—'}
                                  </Text>
                                  {submission ? (
                                    <HStack spacing={3} mt={2}>
                                      <Badge colorScheme={submission.status === 'GRADED' ? 'green' : 'blue'}>
                                        {submission.status}
                                      </Badge>
                                      {submission.fileUrl ? (
                                        <Link href={submission.fileUrl} isExternal color="blue.600" fontWeight="medium">
                                          Download ({submission.fileName || 'file'})
                                        </Link>
                                      ) : null}
                                      {submission.submittedAt ? (
                                        <Text fontSize="xs" color="gray.500">
                                          {new Date(submission.submittedAt).toLocaleString()}
                                        </Text>
                                      ) : null}
                                    </HStack>
                                  ) : (
                                    <Text fontSize="sm" color="gray.500" mt={2}>
                                      Not submitted yet.
                                    </Text>
                                  )}
                                </Box>
                              </HStack>

                              <Box mt={4}>
                                <FormControl>
                                  <FormLabel fontSize="sm">Upload submission</FormLabel>
                                  <Input
                                    type="file"
                                    onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                                  />
                                </FormControl>
                                <Button
                                  mt={3}
                                  colorScheme="blue"
                                  onClick={() => submitWork({ type: 'EXAM', examId: ex.id })}
                                >
                                  {submission ? 'Resubmit' : 'Submit'}
                                </Button>
                              </Box>
                            </Box>
                          );
                        })
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={workModal.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

