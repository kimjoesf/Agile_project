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
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Text,
} from '@chakra-ui/react';
import { FaSearch, FaCheck, FaTimes } from 'react-icons/fa';

const LEAVE_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [currentUser, setCurrentUser] = useState(null);
  const toast = useToast();

  // Modals
  const rejectModal = useDisclosure();
  const createModal = useDisclosure();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [createForm, setCreateForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchCurrentUser();
    fetchRequests();
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

  useEffect(() => {
    filterRequests();
  }, [searchTerm, statusFilter, requests]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leave-requests');
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
        throw new Error('Failed to fetch requests');
      }
      const data = await response.json();
      setRequests(data.leaveRequests || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave requests. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!createForm.startDate || !createForm.endDate || !createForm.reason) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          reason: createForm.reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create leave request');

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setCreateForm({ startDate: '', endDate: '', reason: '' });
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter) {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.staff.user.email.toLowerCase().includes(term) ||
          req.staff.user.userCode.toLowerCase().includes(term) ||
          req.reason.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId) => {
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }

      toast({
        title: 'Success',
        description: 'Leave request approved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/leave-requests/${selectedRequest.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject request');
      }

      toast({
        title: 'Success',
        description: 'Leave request rejected successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      rejectModal.onClose();
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    rejectModal.onOpen();
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading leave requests...</Text>
        </VStack>
      </Center>
    );
  }

  const isApprover = ['DEAN', 'DIRECTOR'].includes(currentUser?.role);

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Leave Requests
          </Heading>
          <Button colorScheme="blue" onClick={createModal.onOpen}>
            New Leave Request
          </Button>
        </Flex>

        <HStack spacing={4}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by staff email, user code, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search leave requests"
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
                <Th>Staff Member</Th>
                <Th>Start Date</Th>
                <Th>End Date</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRequests.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    <Text color="gray.500">No leave requests found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredRequests.map((request) => (
                  <Tr
                    key={request.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {request.staff.user.email}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {request.staff.user.userCode}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>{new Date(request.startDate).toLocaleDateString()}</Td>
                    <Td>{new Date(request.endDate).toLocaleDateString()}</Td>
                    <Td>
                      <Text fontSize="sm" noOfLines={2}>
                        {request.reason}
                      </Text>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={LEAVE_STATUS_COLORS[request.status]}
                        variant="solid"
                      >
                        {request.status}
                      </Badge>
                    </Td>
                    <Td>
                      {isApprover && request.status === 'PENDING' && (
                        <HStack spacing={2}>
                          <Button
                            leftIcon={<FaCheck />}
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(request.id)}
                            aria-label={`Approve leave request from ${request.staff.user.email}`}
                          >
                            Approve
                          </Button>
                          <Button
                            leftIcon={<FaTimes />}
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => openRejectModal(request)}
                            aria-label={`Reject leave request from ${request.staff.user.email}`}
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
          Showing {filteredRequests.length} of {requests.length} requests
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
          <ModalHeader>Reject Leave Request</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {selectedRequest && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Staff:</strong> {selectedRequest.staff.user.email}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Start Date:</strong> {new Date(selectedRequest.startDate).toLocaleDateString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>End Date:</strong> {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Reason:</strong> {selectedRequest.reason}
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
              Reject Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} size="md" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>New Leave Request</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Reason</FormLabel>
                <Textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Enter reason for leave..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreate}>
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

