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
  Select,
  useToast,
  Spinner,
  Center,
  Badge,
  IconButton,
  Tooltip,
  HStack,
  VStack,
  Heading,
  Flex,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FaPlus, FaTimes } from 'react-icons/fa';

const ROOM_TYPE_OPTIONS = [
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'SEMINAR_ROOM', label: 'Seminar Room' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'AUDITORIUM', label: 'Auditorium' },
];

const REQUEST_STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

export default function ProfessorRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const toast = useToast();

  // Modals
  const requestModal = useDisclosure();
  const reservationsModal = useDisclosure();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservationsRoom, setReservationsRoom] = useState(null);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsBookings, setReservationsBookings] = useState([]);

  // Form state
  const [requestForm, setRequestForm] = useState({
    roomId: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  });

  useEffect(() => {
    fetchRooms();
    fetchRequests();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const openReservations = async (room) => {
    try {
      setReservationsRoom(room);
      setReservationsBookings([]);
      setReservationsLoading(true);
      reservationsModal.onOpen();

      const response = await fetch(`/api/rooms/${room.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch room reservations');
      }

      setReservationsBookings(data.room?.bookings || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reservations.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setReservationsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await fetch('/api/room-requests');
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load requests.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleOpenRequestModal = (room = null) => {
    if (room) {
      setSelectedRoom(room);
      setRequestForm({
        ...requestForm,
        roomId: room.id,
      });
    }
    requestModal.onOpen();
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.roomId || !requestForm.date || !requestForm.startTime || !requestForm.endTime) {
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
      // Combine date with time
      const dateTime = new Date(requestForm.date);
      const [startHours, startMinutes] = requestForm.startTime.split(':');
      const [endHours, endMinutes] = requestForm.endTime.split(':');

      const startTime = new Date(dateTime);
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endTime = new Date(dateTime);
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const response = await fetch('/api/room-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: requestForm.roomId,
          date: dateTime.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          reason: requestForm.reason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      toast({
        title: 'Success',
        description: 'Room request submitted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      requestModal.onClose();
      setRequestForm({
        roomId: '',
        date: '',
        startTime: '',
        endTime: '',
        reason: '',
      });
      setSelectedRoom(null);
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCancelRequest = async (requestId) => {
    console.log(requestId);
    try {
      const response = await fetch(`/api/room-requests/${requestId}/cancel`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel request');
      }

      toast({
        title: 'Success',
        description: 'Request cancelled successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            Room Management
          </Heading>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={() => handleOpenRequestModal()}
            aria-label="Request a room"
          >
            Request Room
          </Button>
        </Flex>

        <Tabs>
          <TabList>
            <Tab>Available Rooms</Tab>
            <Tab>My Requests</Tab>
          </TabList>

          <TabPanels>
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
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Location</Th>
                      <Th>Status</Th>
                      <Th>Reservations</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rooms.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} textAlign="center" py={8}>
                          <Text color="gray.500">No rooms available</Text>
                        </Td>
                      </Tr>
                    ) : (
                      rooms.map((room) => (
                        <Tr
                          key={room.id}
                          _hover={{ bg: 'gray.50' }}
                          transition="background-color 0.2s"
                        >
                          <Td fontWeight="medium">
                            <Button
                              variant="link"
                              colorScheme="blue"
                              onClick={() => openReservations(room)}
                            >
                              {room.name}
                            </Button>
                          </Td>
                          <Td>
                            <Badge colorScheme="blue" variant="subtle">
                              {ROOM_TYPE_OPTIONS.find((r) => r.value === room.type)?.label ||
                                room.type}
                            </Badge>
                          </Td>
                          <Td>{room.location}</Td>
                          <Td>
                            <Badge
                              colorScheme={room.status === 'AVAILABLE' ? 'green' : 'red'}
                              variant="solid"
                            >
                              {room.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={room._count?.bookings > 0 ? 'purple' : 'gray'} variant="subtle">
                              {room._count?.bookings > 0 ? 'Yes' : 'No'}
                            </Badge>
                          </Td>
                          <Td>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleOpenRequestModal(room)}
                              isDisabled={room.status === 'MAINTENANCE'}
                            >
                              Request
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
              {requestsLoading ? (
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
                        <Th>Room</Th>
                        <Th>Date</Th>
                        <Th>Time</Th>
                        <Th>Duration</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {requests.length === 0 ? (
                        <Tr>
                          <Td colSpan={6} textAlign="center" py={8}>
                            <Text color="gray.500">No requests found</Text>
                          </Td>
                        </Tr>
                      ) : (
                        requests.map((request) => (
                          <Tr
                            key={request.id}
                            _hover={{ bg: 'gray.50' }}
                            transition="background-color 0.2s"
                          >
                            <Td fontWeight="medium">{request.room.name}</Td>
                            <Td>{formatDate(request.date)}</Td>
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
                                <Tooltip label="Cancel Request" aria-label="Cancel tooltip">
                                  <IconButton
                                    icon={<FaTimes />}
                                    size="sm"
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={() => handleCancelRequest(request.id)}
                                    aria-label={`Cancel request for ${request.room.name}`}
                                  />
                                </Tooltip>
                              )}
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

      {/* Request Room Modal */}
      <Modal
        isOpen={requestModal.isOpen}
        onClose={requestModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Request a Room</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Room</FormLabel>
                <Select
                  value={requestForm.roomId}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, roomId: e.target.value })
                  }
                  placeholder="Select room"
                  aria-label="Select room"
                  isDisabled={!!selectedRoom}
                >
                  {rooms
                    .filter((r) => r.status === 'AVAILABLE')
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} - {room.location}
                      </option>
                    ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, date: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Request date"
                />
              </FormControl>
              <HStack spacing={4} width="100%">
                <FormControl isRequired>
                  <FormLabel>Start Time</FormLabel>
                  <Input
                    type="time"
                    value={requestForm.startTime}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, startTime: e.target.value })
                    }
                    aria-label="Start time"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>End Time</FormLabel>
                  <Input
                    type="time"
                    value={requestForm.endTime}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, endTime: e.target.value })
                    }
                    aria-label="End time"
                  />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Reason (Optional)</FormLabel>
                <Input
                  value={requestForm.reason}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, reason: e.target.value })
                  }
                  placeholder="Purpose of the room request"
                  aria-label="Request reason"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={requestModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmitRequest}>
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={reservationsModal.isOpen} onClose={reservationsModal.onClose} size="xl" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>
            Reservations{reservationsRoom ? `: ${reservationsRoom.name}` : ''}
          </ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {reservationsLoading ? (
              <Center py={8}>
                <Spinner size="lg" color="blue.500" />
              </Center>
            ) : reservationsBookings.length === 0 ? (
              <Text color="gray.500">No upcoming reservations for this room.</Text>
            ) : (
              <TableContainer borderWidth="1px" borderRadius="lg" overflowX="auto" boxShadow="sm">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Date</Th>
                      <Th>Time</Th>
                      <Th>Duration</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reservationsBookings.map((b) => (
                      <Tr key={b.id}>
                        <Td>{formatDate(b.date)}</Td>
                        <Td>
                          {formatTime(b.startTime)} - {formatTime(b.endTime)}
                        </Td>
                        <Td>
                          {getDurationMinutes(b.startTime, b.endTime)
                            ? `${getDurationMinutes(b.startTime, b.endTime)} min`
                            : '—'}
                        </Td>
                        <Td>
                          <Badge colorScheme="purple" variant="subtle">
                            {b.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={reservationsModal.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

