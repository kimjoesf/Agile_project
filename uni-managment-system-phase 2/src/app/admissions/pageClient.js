'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Divider,
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
  SimpleGrid,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FaCheck, FaPlus, FaSearch, FaTimes } from 'react-icons/fa';

const ADMISSION_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

export default function AdmissionsPageClient({ currentUser }) {
  const toast = useToast();

  const role = currentUser?.role;
  const canCreate = role === 'STUDENT_AFFAIRS_OFFICER';
  const canReview = role === 'DEAN' || role === 'DIRECTOR';

  const [admissions, setAdmissions] = useState([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const createModal = useDisclosure();
  const rejectModal = useDisclosure();

  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [createForm, setCreateForm] = useState({
    email: '',
    clerkUserId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: '',
    notes: '',
  });

  const title = useMemo(() => {
    if (canCreate && canReview) return 'Admissions';
    if (canCreate) return 'Admissions (Student Affairs)';
    if (canReview) return 'Admissions (Review)';
    return 'Admissions';
  }, [canCreate, canReview]);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  useEffect(() => {
    let filtered = admissions;

    if (statusFilter) {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.firstName.toLowerCase().includes(term) ||
          a.lastName.toLowerCase().includes(term) ||
          a.applicant?.email?.toLowerCase().includes(term) ||
          a.applicant?.userCode?.toLowerCase().includes(term)
      );
    }

    setFilteredAdmissions(filtered);
  }, [searchTerm, statusFilter, admissions]);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admissions');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access admissions.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        throw new Error('Failed to fetch admissions');
      }
      const data = await response.json();
      setAdmissions(data.admissions || []);
    } catch (error) {
      console.error('Error fetching admissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admissions. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (admissionId) => {
    try {
      const response = await fetch(`/api/admissions/${admissionId}/approve`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve admission');
      }

      toast({
        title: 'Success',
        description: 'Admission approved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchAdmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve admission.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openRejectModal = (admission) => {
    setSelectedAdmission(admission);
    setRejectionReason('');
    rejectModal.onOpen();
  };

  const handleReject = async () => {
    if (!selectedAdmission) return;

    try {
      const response = await fetch(`/api/admissions/${selectedAdmission.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: rejectionReason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject admission');
      }

      toast({
        title: 'Success',
        description: 'Admission rejected successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      rejectModal.onClose();
      setSelectedAdmission(null);
      setRejectionReason('');
      fetchAdmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject admission.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCreateAdmission = async () => {
    if (
      !createForm.email ||
      !createForm.clerkUserId ||
      !createForm.firstName ||
      !createForm.lastName ||
      !createForm.dateOfBirth
    ) {
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
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          phoneNumber: createForm.phoneNumber || null,
          address: createForm.address || null,
          notes: createForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admission');
      }

      toast({
        title: 'Success',
        description: 'Admission created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setCreateForm({
        email: '',
        clerkUserId: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        phoneNumber: '',
        address: '',
        notes: '',
      });
      fetchAdmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admission.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Center minH="70vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Loading admissions...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card variant="outline" borderRadius="xl" overflow="hidden">
          <CardHeader bg="gray.50">
            <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
              <Box>
                <Heading size="lg" color="gray.800">
                  {title}
                </Heading>
                <Text color="gray.600" fontSize="sm" mt={1}>
                  Signed in as {currentUser?.email} ({currentUser?.role})
                </Text>
              </Box>

              {canCreate && (
                <Button
                  leftIcon={<FaPlus />}
                  colorScheme="blue"
                  onClick={createModal.onOpen}
                  alignSelf={{ base: 'stretch', md: 'auto' }}
                >
                  Create Admission
                </Button>
              )}
            </Flex>
          </CardHeader>

          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  Total
                </Text>
                <Heading size="md">{admissions.length}</Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  Pending
                </Text>
                <Heading size="md">
                  {admissions.filter((a) => a.status === 'PENDING').length}
                </Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  Reviewed
                </Text>
                <Heading size="md">
                  {admissions.filter((a) => a.status !== 'PENDING').length}
                </Heading>
              </Box>
            </SimpleGrid>

            <Flex gap={4} direction={{ base: 'column', md: 'row' }} mb={4}>
              <InputGroup maxW={{ base: '100%', md: '420px' }}>
                <InputLeftElement pointerEvents="none">
                  <FaSearch color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search by name, email, or user code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search admissions"
                />
              </InputGroup>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                maxW={{ base: '100%', md: '220px' }}
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </Select>

              <Button variant="outline" onClick={fetchAdmissions}>
                Refresh
              </Button>
            </Flex>

            <Divider my={4} />

            <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto">
              <Table variant="simple" size="md">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Applicant</Th>
                    <Th>Email</Th>
                    <Th>User Code</Th>
                    <Th>Date of Birth</Th>
                    <Th>Status</Th>
                    <Th textAlign="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAdmissions.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} textAlign="center" py={10}>
                        <Text color="gray.500">No admissions found</Text>
                      </Td>
                    </Tr>
                  ) : (
                    filteredAdmissions.map((admission) => (
                      <Tr key={admission.id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="medium">
                          {admission.firstName} {admission.lastName}
                        </Td>
                        <Td>{admission.applicant?.email || '—'}</Td>
                        <Td>{admission.applicant?.userCode || '—'}</Td>
                        <Td>{new Date(admission.dateOfBirth).toLocaleDateString()}</Td>
                        <Td>
                          <Badge colorScheme={ADMISSION_STATUS_COLORS[admission.status]} variant="solid">
                            {admission.status}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack justify="flex-end" spacing={2}>
                            {canReview && admission.status === 'PENDING' ? (
                              <>
                                <Button
                                  leftIcon={<FaCheck />}
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => handleApprove(admission.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  leftIcon={<FaTimes />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => openRejectModal(admission)}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Text color="gray.500" fontSize="sm">
                                —
                              </Text>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>

            <Text color="gray.500" fontSize="sm" mt={3}>
              Showing {filteredAdmissions.length} of {admissions.length} admissions
            </Text>

            {!canReview && canCreate && (
              <Text color="gray.500" fontSize="sm" mt={4}>
                Review actions are available to Dean/Director only.
              </Text>
            )}

            {!canCreate && canReview && (
              <Text color="gray.500" fontSize="sm" mt={4}>
                Creating admissions is available to Student Affairs Officer only.
              </Text>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Create Admission Modal */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} size="xl" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent borderRadius="xl">
          <ModalHeader>Create Admission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Applicant Email</FormLabel>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="student@example.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Clerk User ID</FormLabel>
                  <Input
                    value={createForm.clerkUserId}
                    onChange={(e) => setCreateForm({ ...createForm, clerkUserId: e.target.value })}
                    placeholder="user_xxxxxxxxxxxxx"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Phone Number</FormLabel>
                  <Input
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Textarea
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="Optional"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Optional"
                  rows={3}
                />
              </FormControl>

              <Box bg="gray.50" borderWidth="1px" borderRadius="lg" p={3}>
                <Text fontSize="sm" color="gray.600">
                  This will create a STUDENT user with PENDING status and an admission record.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateAdmission}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal.isOpen} onClose={rejectModal.onClose} size="md" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent borderRadius="xl">
          <ModalHeader>Reject Admission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAdmission && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Applicant:</strong> {selectedAdmission.firstName} {selectedAdmission.lastName}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Email:</strong> {selectedAdmission.applicant?.email}
                  </Text>
                </Box>

                <FormControl>
                  <FormLabel>Rejection Reason (Optional)</FormLabel>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    aria-label="Rejection reason"
                  />
                </FormControl>

                <Box bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="lg" p={3}>
                  <Text fontSize="sm" color="red.700">
                    Rejection will delete the applicant user and the admission record.
                  </Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={rejectModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleReject}>
              Reject
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
