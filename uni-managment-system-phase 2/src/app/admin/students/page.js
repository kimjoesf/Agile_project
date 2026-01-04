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
  Badge,
  HStack,
  VStack,
  Heading,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Text,
} from '@chakra-ui/react';
import { FaSearch, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  // Modals
  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: '',
    enrollmentDate: '',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, statusFilter, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students');
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
        throw new Error('Failed to fetch students');
      }
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term) ||
          s.user.userCode.toLowerCase().includes(term) ||
          s.user.email.toLowerCase().includes(term)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleCreate = async () => {
    if (!studentForm.userId || !studentForm.firstName || !studentForm.lastName || !studentForm.dateOfBirth || !studentForm.enrollmentDate) {
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
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...studentForm,
          dateOfBirth: new Date(studentForm.dateOfBirth).toISOString(),
          enrollmentDate: new Date(studentForm.enrollmentDate).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create student');
      }

      toast({
        title: 'Success',
        description: 'Student created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setStudentForm({ userId: '', firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', address: '', enrollmentDate: '' });
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create student.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedStudent) return;

    try {
      const response = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...studentForm,
          dateOfBirth: new Date(studentForm.dateOfBirth).toISOString(),
          enrollmentDate: new Date(studentForm.enrollmentDate).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update student');
      }

      toast({
        title: 'Success',
        description: 'Student updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      editModal.onClose();
      setSelectedStudent(null);
      setStudentForm({ userId: '', firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', address: '', enrollmentDate: '' });
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update student.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete student');
      }

      toast({
        title: 'Success',
        description: 'Student deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete student.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      userId: student.userId,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: new Date(student.dateOfBirth).toISOString().split('T')[0],
      phoneNumber: student.phoneNumber || '',
      address: student.address || '',
      enrollmentDate: new Date(student.enrollmentDate).toISOString().split('T')[0],
    });
    editModal.onOpen();
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading students...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Student Management
          </Heading>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={createModal.onOpen}
            aria-label="Create student"
          >
            Create Student
          </Button>
        </Flex>

        <HStack spacing={4}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, user code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search students"
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
            <option value="GRADUATED">Graduated</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </Select>
        </HStack>

        <TableContainer
          borderWidth="1px"
          borderRadius="lg"
          overflowX="auto"
          boxShadow="sm"
        >
          <Table variant="simple" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>User Code</Th>
                <Th>Email</Th>
                <Th>Enrollment Date</Th>
                <Th>GPA</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredStudents.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">No students found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredStudents.map((student) => (
                  <Tr
                    key={student.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium">
                      {student.firstName} {student.lastName}
                    </Td>
                    <Td>{student.user.userCode}</Td>
                    <Td>{student.user.email}</Td>
                    <Td>{new Date(student.enrollmentDate).toLocaleDateString()}</Td>
                    <Td>{student.gpa ? student.gpa.toFixed(2) : 'N/A'}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          student.status === 'ACTIVE'
                            ? 'green'
                            : student.status === 'GRADUATED'
                            ? 'blue'
                            : student.status === 'SUSPENDED'
                            ? 'red'
                            : 'gray'
                        }
                        variant="solid"
                      >
                        {student.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          leftIcon={<FaEdit />}
                          onClick={() => openEditModal(student)}
                          aria-label={`Edit ${student.firstName} ${student.lastName}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          leftIcon={<FaTrash />}
                          onClick={() => handleDelete(student.id)}
                          aria-label={`Delete ${student.firstName} ${student.lastName}`}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Text color="gray.500" fontSize="sm">
          Showing {filteredStudents.length} of {students.length} students
        </Text>
      </VStack>

      {/* Create Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        size="lg"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create Student</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>User ID</FormLabel>
                <Input
                  value={studentForm.userId}
                  onChange={(e) => setStudentForm({ ...studentForm, userId: e.target.value })}
                  placeholder="Enter user ID"
                  aria-label="User ID"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  aria-label="First name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  aria-label="Last name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={studentForm.dateOfBirth}
                  onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                  aria-label="Date of birth"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  value={studentForm.phoneNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                  aria-label="Phone number"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Textarea
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  aria-label="Address"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Enrollment Date</FormLabel>
                <Input
                  type="date"
                  value={studentForm.enrollmentDate}
                  onChange={(e) => setStudentForm({ ...studentForm, enrollmentDate: e.target.value })}
                  aria-label="Enrollment date"
                />
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        size="lg"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Edit Student</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  aria-label="First name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  aria-label="Last name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={studentForm.dateOfBirth}
                  onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                  aria-label="Date of birth"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  value={studentForm.phoneNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                  aria-label="Phone number"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Textarea
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  aria-label="Address"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Enrollment Date</FormLabel>
                <Input
                  type="date"
                  value={studentForm.enrollmentDate}
                  onChange={(e) => setStudentForm({ ...studentForm, enrollmentDate: e.target.value })}
                  aria-label="Enrollment date"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdate}>
              Update
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

