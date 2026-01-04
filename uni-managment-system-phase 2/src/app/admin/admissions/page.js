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
  Input,
} from '@chakra-ui/react';
import { FaSearch, FaCheck, FaTimes } from 'react-icons/fa';

const ADMISSION_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const toast = useToast();

  // Modals
  const rejectModal = useDisclosure();
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchAdmissions();
  }, []);

  useEffect(() => {
    filterAdmissions();
  }, [searchTerm, statusFilter, admissions]);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admissions');
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

  const filterAdmissions = () => {
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
          a.applicant.email.toLowerCase().includes(term) ||
          a.applicant.userCode.toLowerCase().includes(term)
      );
    }

    setFilteredAdmissions(filtered);
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

  const openRejectModal = (admission) => {
    setSelectedAdmission(admission);
    setRejectionReason('');
    rejectModal.onOpen();
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading admissions...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Admission Management
        </Heading>

        <HStack spacing={4}>
          <InputGroup maxW="400px">
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
            maxW="200px"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
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
                <Th>Applicant</Th>
                <Th>Email</Th>
                <Th>Date of Birth</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAdmissions.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    <Text color="gray.500">No admissions found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredAdmissions.map((admission) => (
                  <Tr
                    key={admission.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium">
                      {admission.firstName} {admission.lastName}
                    </Td>
                    <Td>{admission.applicant.email}</Td>
                    <Td>{new Date(admission.dateOfBirth).toLocaleDateString()}</Td>
                    <Td>{admission.phoneNumber || 'N/A'}</Td>
                    <Td>
                      <Badge
                        colorScheme={ADMISSION_STATUS_COLORS[admission.status]}
                        variant="solid"
                      >
                        {admission.status}
                      </Badge>
                    </Td>
                    <Td>
                      {admission.status === 'PENDING' && (
                        <HStack spacing={2}>
                          <Button
                            leftIcon={<FaCheck />}
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(admission.id)}
                            aria-label={`Approve admission for ${admission.firstName} ${admission.lastName}`}
                          >
                            Approve
                          </Button>
                          <Button
                            leftIcon={<FaTimes />}
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => openRejectModal(admission)}
                            aria-label={`Reject admission for ${admission.firstName} ${admission.lastName}`}
                          >
                            Reject
                          </Button>
                        </HStack>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Text color="gray.500" fontSize="sm">
          Showing {filteredAdmissions.length} of {admissions.length} admissions
        </Text>
      </VStack>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={rejectModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Reject Admission</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {selectedAdmission && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Applicant:</strong> {selectedAdmission.firstName} {selectedAdmission.lastName}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Email:</strong> {selectedAdmission.applicant.email}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Date of Birth:</strong> {new Date(selectedAdmission.dateOfBirth).toLocaleDateString()}
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
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={rejectModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleReject}>
              Reject Admission
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

