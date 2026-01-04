'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
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
  useToast,
  Spinner,
  Center,
  VStack,
  Heading,
  InputGroup,
  InputLeftElement,
  Flex,
  Text,
  Select,
  HStack,
} from '@chakra-ui/react';
import { FaSearch, FaPlus } from 'react-icons/fa';

export default function TranscriptsPage() {
  const [students, setStudents] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  // Modal
  const createModal = useDisclosure();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [gpa, setGpa] = useState('');
  const [courses, setCourses] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchTranscripts();
  }, []);

  useEffect(() => {
    filterTranscripts();
  }, [searchTerm, transcripts]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transcripts');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this page.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        throw new Error('Failed to fetch transcripts');
      }
      const data = await response.json();
      setTranscripts(data.transcripts || []);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transcripts. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTranscripts = () => {
    let filtered = transcripts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.student.firstName.toLowerCase().includes(term) ||
          t.student.lastName.toLowerCase().includes(term) ||
          t.student.user.userCode.toLowerCase().includes(term) ||
          t.student.user.email.toLowerCase().includes(term)
      );
    }

    setFilteredTranscripts(filtered);
  };

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a student.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      let parsedCourses = [];
      if (courses.trim()) {
        try {
          parsedCourses = JSON.parse(courses);
        } catch (e) {
          toast({
            title: 'Validation Error',
            description: 'Courses must be valid JSON array.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }

      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          gpa: gpa ? parseFloat(gpa) : undefined,
          courses: parsedCourses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate transcript');
      }

      toast({
        title: 'Success',
        description: 'Transcript generated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setSelectedStudentId('');
      setGpa('');
      setCourses('');
      fetchTranscripts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate transcript.',
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
          <Text>Loading transcripts...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Transcript Management
          </Heading>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={createModal.onOpen}
            aria-label="Generate transcript"
          >
            Generate Transcript
          </Button>
        </Flex>

        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <FaSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by student name, code, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search transcripts"
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
                <Th>Student</Th>
                <Th>GPA</Th>
                <Th>Generated At</Th>
                <Th>PDF</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredTranscripts.length === 0 ? (
                <Tr>
                  <Td colSpan={4} textAlign="center" py={8}>
                    <Text color="gray.500">No transcripts found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredTranscripts.map((transcript) => (
                  <Tr
                    key={transcript.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium">
                      {transcript.student.firstName} {transcript.student.lastName} ({transcript.student.user.userCode})
                    </Td>
                    <Td>{transcript.gpa.toFixed(2)}</Td>
                    <Td>{new Date(transcript.generatedAt).toLocaleDateString()}</Td>
                    <Td>
                      {transcript.pdfPath ? (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          as="a"
                          href={transcript.pdfPath}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View PDF
                        </Button>
                      ) : (
                        <Text color="gray.500" fontSize="sm">No PDF</Text>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Text color="gray.500" fontSize="sm">
          Showing {filteredTranscripts.length} of {transcripts.length} transcripts
        </Text>
      </VStack>

      {/* Generate Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        size="lg"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Generate Transcript</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Student</FormLabel>
                <Select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  placeholder="Select student"
                  aria-label="Select student"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.user.userCode})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>GPA (Optional - will be calculated if not provided)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="Enter GPA"
                  aria-label="GPA"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Courses (JSON Array - Optional)</FormLabel>
                <Textarea
                  value={courses}
                  onChange={(e) => setCourses(e.target.value)}
                  placeholder='[{"courseCode": "CS101", "courseName": "Intro to CS", "creditHours": 3, "grade": 85, "semester": "Fall", "year": 2024}]'
                  minH="150px"
                  aria-label="Courses JSON"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Enter courses as JSON array. If empty, will fetch from enrollments.
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleGenerate}>
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

