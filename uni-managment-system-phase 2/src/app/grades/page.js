'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select as ChakraSelect,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  useDisclosure,
  Spinner,
  Center,
  Badge,
  VStack,
  Heading,
  Select,
  Flex,
  Text,
  HStack,
} from '@chakra-ui/react';

export default function GradesPage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', maxScore: '', feedback: '', status: 'DRAFT' });
  const gradeModal = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchCourses();
    fetchGrades();
  }, []);

  useEffect(() => {
    fetchGrades();
    if (courseFilter && ['PROFESSOR', 'TEACHING_ASSISTANT'].includes(currentUser?.role)) {
      fetchSubmissions();
    } else {
      setSubmissions([]);
    }
  }, [courseFilter]);

  useEffect(() => {
    if (courseFilter && ['PROFESSOR', 'TEACHING_ASSISTANT'].includes(currentUser?.role)) {
      fetchSubmissions();
    }
  }, [currentUser?.role]);

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
      const response = await fetch('/api/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!courseFilter) return;
    try {
      setSubmissionsLoading(true);
      const response = await fetch(`/api/submissions?courseId=${courseFilter}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch submissions');
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const url = courseFilter
        ? `/api/grades?courseId=${courseFilter}`
        : '/api/grades';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch grades');
      const data = await response.json();
      setGrades(data.grades || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grades.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (score, maxScore) => {
    if (maxScore === 0) return 0;
    return ((score / maxScore) * 100).toFixed(1);
  };

  const getGradeType = (grade) => {
    if (grade.assignment) return 'Assignment';
    if (grade.quiz) return 'Quiz';
    if (grade.exam) return 'Exam';
    return 'Unknown';
  };

  const getGradeCourse = (grade) => grade.assignment?.course || grade.quiz?.course || grade.exam?.course;
  const getGradeItem = (grade) => grade.assignment || grade.quiz || grade.exam;

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      score: submission.grade?.score ?? '',
      maxScore: submission.grade?.maxScore ?? '',
      feedback: '',
      status: submission.grade?.status ?? 'DRAFT',
    });
    gradeModal.onOpen();
  };

  const submitGrade = async () => {
    if (!selectedSubmission) return;

    const studentId = selectedSubmission.student?.id;
    if (!studentId) return;

    const assignmentId = selectedSubmission.assignment?.id || null;
    const quizId = selectedSubmission.quiz?.id || null;
    const examId = selectedSubmission.exam?.id || null;

    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          submissionId: selectedSubmission.id,
          assignmentId,
          quizId,
          examId,
          score: parseFloat(gradeForm.score),
          maxScore: parseFloat(gradeForm.maxScore),
          feedback: gradeForm.feedback,
          status: gradeForm.status,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save grade');

      toast({
        title: 'Success',
        description: 'Grade saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      gradeModal.onClose();
      fetchGrades();
      fetchSubmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save grade.',
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
          <Text>Loading grades...</Text>
        </VStack>
      </Center>
    );
  }

  const isInstructor = ['PROFESSOR', 'TEACHING_ASSISTANT'].includes(currentUser?.role);
  const assignmentsGrades = grades.filter((g) => g.assignment);
  const quizzesGrades = grades.filter((g) => g.quiz);
  const examsGrades = grades.filter((g) => g.exam);

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Grades
          </Heading>
          <Select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            maxW="300px"
            placeholder="Filter by course"
            aria-label="Filter by course"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </Select>
        </Flex>

        <Tabs>
          <TabList>
            <Tab>Assignments</Tab>
            <Tab>Quizzes</Tab>
            <Tab>Exams</Tab>
            {isInstructor ? <Tab>Submissions</Tab> : null}
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <GradesTable
                grades={assignmentsGrades}
                isInstructor={isInstructor}
                calculatePercentage={calculatePercentage}
                getGradeCourse={getGradeCourse}
                getGradeItem={getGradeItem}
                getGradeType={getGradeType}
              />
            </TabPanel>

            <TabPanel px={0}>
              <GradesTable
                grades={quizzesGrades}
                isInstructor={isInstructor}
                calculatePercentage={calculatePercentage}
                getGradeCourse={getGradeCourse}
                getGradeItem={getGradeItem}
                getGradeType={getGradeType}
              />
            </TabPanel>

            <TabPanel px={0}>
              <GradesTable
                grades={examsGrades}
                isInstructor={isInstructor}
                calculatePercentage={calculatePercentage}
                getGradeCourse={getGradeCourse}
                getGradeItem={getGradeItem}
                getGradeType={getGradeType}
              />
            </TabPanel>

            {isInstructor ? (
              <TabPanel px={0}>
                {!courseFilter ? (
                  <Center py={10}>
                    <Text color="gray.500">Select a course to view submissions.</Text>
                  </Center>
                ) : submissionsLoading ? (
                  <Center py={10}>
                    <Spinner size="lg" color="blue.500" />
                  </Center>
                ) : (
                  <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto" boxShadow="sm">
                    <Table variant="simple" size="md">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Student</Th>
                          <Th>Student ID</Th>
                          <Th>Type</Th>
                          <Th>Item</Th>
                          <Th>File</Th>
                          <Th>Submitted</Th>
                          <Th>Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {submissions.length === 0 ? (
                          <Tr>
                            <Td colSpan={8} textAlign="center" py={8}>
                              <Text color="gray.500">No submissions found</Text>
                            </Td>
                          </Tr>
                        ) : (
                          submissions.map((s) => {
                            const item = s.assignment || s.quiz || s.exam;
                            return (
                              <Tr key={s.id} _hover={{ bg: 'gray.50' }} transition="background-color 0.2s">
                                <Td fontWeight="medium">
                                  {s.student?.firstName} {s.student?.lastName}
                                </Td>
                                <Td>{s.student?.user?.userCode || '—'}</Td>
                                <Td>
                                  <Badge colorScheme="blue" variant="subtle">
                                    {s.type}
                                  </Badge>
                                </Td>
                                <Td>{item?.title || '—'}</Td>
                                <Td>
                                  {s.fileUrl ? (
                                    <Link href={s.fileUrl} isExternal color="blue.600" fontWeight="medium">
                                      Download
                                    </Link>
                                  ) : (
                                    '—'
                                  )}
                                </Td>
                                <Td>{new Date(s.submittedAt).toLocaleString()}</Td>
                                <Td>
                                  <Badge colorScheme={s.status === 'GRADED' ? 'green' : 'yellow'} variant="solid">
                                    {s.status}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Button size="sm" colorScheme="blue" variant="outline" onClick={() => openGradeModal(s)}>
                                    Grade
                                  </Button>
                                </Td>
                              </Tr>
                            );
                          })
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
            ) : null}
          </TabPanels>
        </Tabs>

        <Text color="gray.500" fontSize="sm">
          Showing {grades.length} grade{grades.length !== 1 ? 's' : ''}
        </Text>
      </VStack>

      <Modal isOpen={gradeModal.isOpen} onClose={gradeModal.onClose} size="md">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Grade Submission</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              {selectedSubmission?.fileUrl ? (
                <Box w="full" borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                    Submitted File
                  </Text>
                  <Link href={selectedSubmission.fileUrl} isExternal color="blue.600" fontWeight="medium">
                    {selectedSubmission.fileName || 'Download'}
                  </Link>
                </Box>
              ) : null}
              <FormControl isRequired>
                <FormLabel>Score</FormLabel>
                <Input
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                  aria-label="Score"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Max Score</FormLabel>
                <Input
                  value={gradeForm.maxScore}
                  onChange={(e) => setGradeForm({ ...gradeForm, maxScore: e.target.value })}
                  aria-label="Max score"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Feedback</FormLabel>
                <Input
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  aria-label="Feedback"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <ChakraSelect
                  value={gradeForm.status}
                  onChange={(e) => setGradeForm({ ...gradeForm, status: e.target.value })}
                  aria-label="Grade status"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </ChakraSelect>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={gradeModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={submitGrade}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function GradesTable({ grades, isInstructor, calculatePercentage, getGradeCourse, getGradeItem, getGradeType }) {
  return (
    <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto" boxShadow="sm">
      <Table variant="simple" size="md">
        <Thead bg="gray.50">
          <Tr>
            {isInstructor ? <Th>Student</Th> : null}
            {isInstructor ? <Th>Student ID</Th> : null}
            <Th>Course</Th>
            <Th>Type</Th>
            <Th>Item</Th>
            <Th>Score</Th>
            <Th>Percentage</Th>
            <Th>Status</Th>
            <Th>Feedback</Th>
          </Tr>
        </Thead>
        <Tbody>
          {grades.length === 0 ? (
            <Tr>
              <Td colSpan={isInstructor ? 9 : 7} textAlign="center" py={8}>
                <Text color="gray.500">No grades found</Text>
              </Td>
            </Tr>
          ) : (
            grades.map((grade) => {
              const course = getGradeCourse(grade);
              const item = getGradeItem(grade);
              const percentage = calculatePercentage(grade.score, grade.maxScore);

              return (
                <Tr key={grade.id} _hover={{ bg: 'gray.50' }} transition="background-color 0.2s">
                  {isInstructor ? (
                    <Td fontWeight="medium">{grade.student?.fullName || '—'}</Td>
                  ) : null}
                  {isInstructor ? <Td>{grade.student?.studentCode || '—'}</Td> : null}
                  <Td fontWeight="medium">{course?.code || 'N/A'} - {course?.name || 'N/A'}</Td>
                  <Td>
                    <Badge colorScheme="blue" variant="subtle">
                      {getGradeType(grade)}
                    </Badge>
                  </Td>
                  <Td>{item?.title || 'N/A'}</Td>
                  <Td>
                    {grade.score.toFixed(2)} / {grade.maxScore.toFixed(2)}
                  </Td>
                  <Td>{percentage}%</Td>
                  <Td>
                    <Badge colorScheme={grade.status === 'PUBLISHED' ? 'green' : 'yellow'} variant="solid">
                      {grade.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Text fontSize="sm" noOfLines={2}>
                      {grade.feedback || '-'}
                    </Text>
                  </Td>
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

