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
  Flex,
  Text,
  InputGroup,
  InputLeftElement,
  Select,
  Input,
} from '@chakra-ui/react';
import { FaSearch, FaCheck, FaTimes } from 'react-icons/fa';

const REQUEST_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

export default function AdminRoomRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const toast = useToast();

  // Modals
  const rejectModal = useDisclosure();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchTerm, statusFilter, requests]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/room-requests');
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
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load requests. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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
          req.room.name.toLowerCase().includes(term) ||
          req.requester.email.toLowerCase().includes(term) ||
          req.requester.userCode.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId) => {
    try {
      const response = await fetch(`/api/room-requests/${requestId}/approve`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }

      toast({
        title: 'Success',
        description: 'Room request approved successfully.',
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
      const response = await fetch(`/api/room-requests/${selectedRequest.id}/reject`, {
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
        description: 'Room request rejected successfully.',
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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDurationMinutes = (start, end) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
    const mins = Math.round((e - s) / 60000);
    return mins > 0 ? mins : null;
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading requests...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.700">
          Room Request Management
        </Heading>

        <HStack spacing={4}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by room, email, or user code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search requests"
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
            <option value="CANCELLED">Cancelled</option>
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
                <Th>Room</Th>
                <Th>Requester</Th>
                <Th>Date</Th>
                <Th>Time</Th>
                <Th>Duration</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRequests.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">No requests found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredRequests.map((request) => (
                  <Tr
                    key={request.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium">{request.room.name}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm">{request.requester.email}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {request.requester.userCode}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>{formatDateTime(request.date)}</Td>
                    <Td>
                      {formatTime(request.startTime)} - {formatTime(request.endTime)}
                    </Td>
                    <Td>{getDurationMinutes(request.startTime, request.endTime) ? `${getDurationMinutes(request.startTime, request.endTime)} min` : '—'}</Td>
                    <Td>
                      <Badge
                        colorScheme={REQUEST_STATUS_COLORS[request.status]}
                        variant="solid"
                      >
                        {request.status}
                      </Badge>
                    </Td>
                    <Td>
                      {request.status === 'PENDING' && (
                        <HStack spacing={2}>
                          <Button
                            leftIcon={<FaCheck />}
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(request.id)}
                            aria-label={`Approve request from ${request.requester.email}`}
                          >
                            Approve
                          </Button>
                          <Button
                            leftIcon={<FaTimes />}
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => openRejectModal(request)}
                            aria-label={`Reject request from ${request.requester.email}`}
                          >
                            Reject
                          </Button>
                        </HStack>
                      )}
                      {request.reason && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Reason: {request.reason}
                        </Text>
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
          <ModalHeader>Reject Room Request</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {selectedRequest && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Room:</strong> {selectedRequest.room.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Requester:</strong> {selectedRequest.requester.email}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Date:</strong> {formatDateTime(selectedRequest.date)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Time:</strong> {formatTime(selectedRequest.startTime)} -{' '}
                    {formatTime(selectedRequest.endTime)}
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
    </Box>
  );
}

