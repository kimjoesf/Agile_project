'use client';

import { useState, useEffect } from 'react';
import {Box, Button, Table, Thead,Tbody, Tr, Th, Td, TableContainer, useDisclosure,Modal,  ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,FormControl,FormLabel,Input, Textarea, useToast, Spinner, Center,Badge, HStack, VStack,Heading, Flex, Text, Tabs, TabList,TabPanels, Tab, TabPanel, NumberInput, NumberInputField, Link,} from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';

export default function ProfessorCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [exams, setExams] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const toast = useToast();

  // Modals
  const assignmentModal = useDisclosure();
  const quizModal = useDisclosure();
  const examModal = useDisclosure();
  const materialModal = useDisclosure();

  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    deadline: '',
    maxScore: '100',
  });
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    questions: '',
    timeLimit: '',
    maxScore: '100',
  });
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    date: '',
    maxScore: '100',
  });
  const [materialForm, setMaterialForm] = useState({
    description: '',
    file: null,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchCourses();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/current');
      if (!response.ok) return;
      const data = await response.json();
      setCurrentUser(data.user || null);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      // Filter to only courses taught by current user
      // In real app, this would be filtered server-side
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

  const handleCreateExam = async () => {
    if (!selectedCourse || !examForm.title || !examForm.date) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...examForm,
          maxScore: parseFloat(examForm.maxScore),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create exam');
      }

      toast({
        title: 'Success',
        description: 'Exam created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      examModal.onClose();
      setExamForm({ title: '', description: '', date: '', maxScore: '100' });
      fetchExams(selectedCourse.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exam.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUploadMaterial = async () => {
    if (!selectedCourse || !materialForm.file) {
      toast({
        title: 'Validation Error',
        description: 'Please select a file to upload.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', materialForm.file);
      formData.append('description', materialForm.description || '');

      const response = await fetch(`/api/courses/${selectedCourse.id}/materials`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload material');
      }

      toast({
        title: 'Success',
        description: 'Material uploaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      materialModal.onClose();
      setMaterialForm({ description: '', file: null });
      fetchMaterials(selectedCourse.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload material.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchAssignments = async (courseId) => {
    try {
      const response = await fetch(`/api/assignments?courseId=${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      const response = await fetch(`/api/quizzes?courseId=${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const fetchExams = async (courseId) => {
    try {
      const response = await fetch(`/api/exams?courseId=${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch exams');
      const data = await response.json();
      setExams(data.exams || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course materials');
      const data = await response.json();
      setMaterials(data.course?.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setTabIndex(0);
    fetchAssignments(course.id);
    fetchQuizzes(course.id);
    if (currentUser?.role === 'PROFESSOR') {
      fetchExams(course.id);
    }
    fetchMaterials(course.id);
  };

  const handleCreateAssignment = async () => {
    if (!selectedCourse || !assignmentForm.title || !assignmentForm.deadline) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...assignmentForm,
          maxScore: parseFloat(assignmentForm.maxScore),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assignment');
      }

      toast({
        title: 'Success',
        description: 'Assignment created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      assignmentModal.onClose();
      setAssignmentForm({ title: '', description: '', deadline: '', maxScore: '100' });
      fetchAssignments(selectedCourse.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create assignment.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedCourse || !quizForm.title || !quizForm.questions) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      let questions;
      try {
        questions = JSON.parse(quizForm.questions);
      } catch {
        throw new Error('Questions must be valid JSON array');
      }

      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...quizForm,
          questions,
          timeLimit: quizForm.timeLimit ? parseInt(quizForm.timeLimit) : null,
          maxScore: parseFloat(quizForm.maxScore),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quiz');
      }

      toast({
        title: 'Success',
        description: 'Quiz created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      quizModal.onClose();
      setQuizForm({ title: '', description: '', questions: '', timeLimit: '', maxScore: '100' });
      fetchQuizzes(selectedCourse.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quiz.',
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
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Course Management
        </Heading>

        <Tabs index={tabIndex} onChange={setTabIndex}>
          <TabList>
            <Tab>My Courses</Tab>
            <Tab isDisabled={!selectedCourse}>Assignments</Tab>
            <Tab isDisabled={!selectedCourse}>Quizzes</Tab>
            {currentUser?.role === 'PROFESSOR' && (
              <Tab isDisabled={!selectedCourse}>Exams</Tab>
            )}
            <Tab isDisabled={!selectedCourse}>Materials</Tab>
          </TabList>

          <TabPanels>
            {/* ================= My Courses ================= */}
            <TabPanel px={0}>
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
                      <Th>Enrollments</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {courses.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} textAlign="center" py={8}>
                          <Text color="gray.500">No courses found</Text>
                        </Td>
                      </Tr>
                    ) : (
                      courses.map((course) => (
                        <Tr
                          key={course.id}
                          _hover={{ bg: 'gray.50' }}
                          transition="background-color 0.2s"
                          cursor="pointer"
                          onClick={() => handleSelectCourse(course)}
                          bg={selectedCourse?.id === course.id ? 'blue.50' : 'white'}
                        >
                          <Td fontWeight="medium">{course.code}</Td>
                          <Td>{course.name}</Td>
                          <Td>{course.creditHours}</Td>
                          <Td>{course._count?.enrollments || 0}</Td>
                          <Td>
                            <Badge
                              colorScheme={course.status === 'ACTIVE' ? 'green' : 'gray'}
                              variant="solid"
                            >
                              {course.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Button size="sm" colorScheme="blue" variant="outline">
                              Manage
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ================= Assignments ================= */}
            <TabPanel px={0}>
              {!selectedCourse ? (
                <Center py={10}>
                  <Text color="gray.500">Select a course to manage assignments.</Text>
                </Center>
              ) : (
                <>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Text fontSize="lg" fontWeight="medium">
                      Assignments for {selectedCourse.code}
                    </Text>
                    <Button
                      leftIcon={<FaPlus />}
                      colorScheme="blue"
                      onClick={assignmentModal.onOpen}
                    >
                      Create Assignment
                    </Button>
                  </Flex>

                  <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto">
                    <Table variant="simple" size="md">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Title</Th>
                          <Th>Deadline</Th>
                          <Th>Max Score</Th>
                          <Th>Grades</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {assignments.length === 0 ? (
                          <Tr>
                            <Td colSpan={4} textAlign="center" py={8}>
                              <Text color="gray.500">No assignments found</Text>
                            </Td>
                          </Tr>
                        ) : (
                          assignments.map((a) => (
                            <Tr key={a.id}>
                              <Td fontWeight="medium">{a.title}</Td>
                              <Td>{new Date(a.deadline).toLocaleString()}</Td>
                              <Td>{a.maxScore}</Td>
                              <Td>{a._count?.grades || 0}</Td>
                            </Tr>
                          ))
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* ================= Quizzes ================= */}
            <TabPanel px={0}>
              {!selectedCourse ? (
                <Center py={10}>
                  <Text color="gray.500">Select a course to manage quizzes.</Text>
                </Center>
              ) : (
                <>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Text fontSize="lg" fontWeight="medium">
                      Quizzes for {selectedCourse.code}
                    </Text>
                    <Button
                      leftIcon={<FaPlus />}
                      colorScheme="blue"
                      onClick={quizModal.onOpen}
                    >
                      Create Quiz
                    </Button>
                  </Flex>

                  <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto">
                    <Table variant="simple" size="md">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Title</Th>
                          <Th>Time Limit</Th>
                          <Th>Max Score</Th>
                          <Th>Grades</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {quizzes.length === 0 ? (
                          <Tr>
                            <Td colSpan={4} textAlign="center" py={8}>
                              <Text color="gray.500">No quizzes found</Text>
                            </Td>
                          </Tr>
                        ) : (
                          quizzes.map((q) => (
                            <Tr key={q.id}>
                              <Td fontWeight="medium">{q.title}</Td>
                              <Td>{q.timeLimit ? `${q.timeLimit} min` : 'No limit'}</Td>
                              <Td>{q.maxScore}</Td>
                              <Td>{q._count?.grades || 0}</Td>
                            </Tr>
                          ))
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* ================= Exams (Professor only) ================= */}
            {currentUser?.role === 'PROFESSOR' && (
              <TabPanel px={0}>
                {!selectedCourse ? (
                  <Center py={10}>
                    <Text color="gray.500">Select a course to manage exams.</Text>
                  </Center>
                ) : (
                  <>
                    <Flex justify="space-between" align="center" mb={4}>
                      <Text fontSize="lg" fontWeight="medium">
                        Exams for {selectedCourse.code}
                      </Text>
                      <Button
                        leftIcon={<FaPlus />}
                        colorScheme="blue"
                        onClick={examModal.onOpen}
                      >
                        Create Exam
                      </Button>
                    </Flex>

                    <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto">
                      <Table variant="simple" size="md">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Title</Th>
                            <Th>Date</Th>
                            <Th>Max Score</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {exams.length === 0 ? (
                            <Tr>
                              <Td colSpan={3} textAlign="center" py={8}>
                                <Text color="gray.500">No exams found</Text>
                              </Td>
                            </Tr>
                          ) : (
                            exams.map((e) => (
                              <Tr key={e.id}>
                                <Td fontWeight="medium">{e.title}</Td>
                                <Td>{new Date(e.date).toLocaleString()}</Td>
                                <Td>{e.maxScore}</Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </TabPanel>
            )}

            {/* ================= Materials ================= */}
            <TabPanel px={0}>
              {!selectedCourse ? (
                <Center py={10}>
                  <Text color="gray.500">Select a course to manage materials.</Text>
                </Center>
              ) : (
                <>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Text fontSize="lg" fontWeight="medium">
                      Materials for {selectedCourse.code}
                    </Text>
                    <Button
                      leftIcon={<FaPlus />}
                      colorScheme="blue"
                      onClick={materialModal.onOpen}
                    >
                      Upload Material
                    </Button>
                  </Flex>

                  <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto">
                    <Table variant="simple" size="md">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>File</Th>
                          <Th>Description</Th>
                          <Th>Uploaded At</Th>
                          <Th>Link</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {materials.length === 0 ? (
                          <Tr>
                            <Td colSpan={4} textAlign="center" py={8}>
                              <Text color="gray.500">No materials uploaded</Text>
                            </Td>
                          </Tr>
                        ) : (
                          materials.map((m, idx) => (
                            <Tr key={`${m.url || m.filename}-${idx}`}>
                              <Td fontWeight="medium">{m.filename || 'File'}</Td>
                              <Td>{m.description || '—'}</Td>
                              <Td>
                                {m.uploadedAt
                                  ? new Date(m.uploadedAt).toLocaleString()
                                  : '—'}
                              </Td>
                              <Td>
                                {m.url ? (
                                  <Link href={m.url} isExternal color="blue.600">
                                    Open
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </Td>
                            </Tr>
                          ))
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>


      {/* Create Assignment Modal */}
      <Modal
        isOpen={assignmentModal.isOpen}
        onClose={assignmentModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Assignment</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={assignmentForm.title}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, title: e.target.value })
                  }
                  aria-label="Assignment title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={assignmentForm.description}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, description: e.target.value })
                  }
                  aria-label="Assignment description"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Deadline</FormLabel>
                <Input
                  type="datetime-local"
                  value={assignmentForm.deadline}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, deadline: e.target.value })
                  }
                  aria-label="Assignment deadline"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Max Score</FormLabel>
                <NumberInput
                  value={assignmentForm.maxScore}
                  onChange={(value) =>
                    setAssignmentForm({ ...assignmentForm, maxScore: value })
                  }
                  min={0}
                >
                  <NumberInputField aria-label="Maximum score" />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={assignmentModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateAssignment}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Quiz Modal */}
      <Modal
        isOpen={quizModal.isOpen}
        onClose={quizModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Quiz</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={quizForm.title}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, title: e.target.value })
                  }
                  aria-label="Quiz title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={quizForm.description}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, description: e.target.value })
                  }
                  aria-label="Quiz description"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Questions (JSON Array)</FormLabel>
                <Textarea
                  value={quizForm.questions}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, questions: e.target.value })
                  }
                  placeholder='[{"question": "...", "options": [...], "correctAnswer": 0}]'
                  aria-label="Quiz questions"
                  minH="150px"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Time Limit (minutes)</FormLabel>
                <NumberInput
                  value={quizForm.timeLimit}
                  onChange={(value) =>
                    setQuizForm({ ...quizForm, timeLimit: value })
                  }
                  min={1}
                >
                  <NumberInputField aria-label="Time limit" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Max Score</FormLabel>
                <NumberInput
                  value={quizForm.maxScore}
                  onChange={(value) =>
                    setQuizForm({ ...quizForm, maxScore: value })
                  }
                  min={0}
                >
                  <NumberInputField aria-label="Maximum score" />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={quizModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateQuiz}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Exam Modal */}
      <Modal
        isOpen={examModal.isOpen}
        onClose={examModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Exam</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  aria-label="Exam title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={examForm.description}
                  onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                  aria-label="Exam description"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="datetime-local"
                  value={examForm.date}
                  onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                  aria-label="Exam date"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Max Score</FormLabel>
                <NumberInput
                  value={examForm.maxScore}
                  onChange={(value) => setExamForm({ ...examForm, maxScore: value })}
                  min={0}
                >
                  <NumberInputField aria-label="Maximum score" />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={examModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateExam}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Upload Material Modal */}
      <Modal
        isOpen={materialModal.isOpen}
        onClose={materialModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Upload Material</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>File</FormLabel>
                <Input
                  type="file"
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  aria-label="Material file"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  aria-label="Material description"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={materialModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUploadMaterial}>
              Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

