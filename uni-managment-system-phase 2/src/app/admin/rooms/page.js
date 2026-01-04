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
  InputGroup,
  InputLeftElement,
  Flex,
  Text,
  NumberInput,
  NumberInputField,
  Textarea,
} from '@chakra-ui/react';
import { FaSearch, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const ROOM_TYPE_OPTIONS = [
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'SEMINAR_ROOM', label: 'Seminar Room' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'AUDITORIUM', label: 'Auditorium' },
];

const ROOM_STATUS_COLORS = {
  AVAILABLE: 'green',
  MAINTENANCE: 'red',
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  // Modals
  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const reservationsModal = useDisclosure();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservationsRoom, setReservationsRoom] = useState(null);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsBookings, setReservationsBookings] = useState([]);

  // Form states
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: '',
    location: '',
    capacity: '',
    description: '',
    status: 'AVAILABLE',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [searchTerm, rooms]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rooms');
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
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms. Please try again.',
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

  const filterRooms = () => {
    let filtered = rooms;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.name.toLowerCase().includes(term) ||
          room.location.toLowerCase().includes(term) ||
          room.type.toLowerCase().includes(term)
      );
    }

    setFilteredRooms(filtered);
  };

  const handleOpenCreateModal = () => {
    setRoomForm({
      name: '',
      type: '',
      location: '',
      capacity: '',
      description: '',
      status: 'AVAILABLE',
    });
    setSelectedRoom(null);
    createModal.onOpen();
  };

  const handleOpenEditModal = (room) => {
    setSelectedRoom(room);
    setRoomForm({
      name: room.name,
      type: room.type,
      location: room.location,
      capacity: room.capacity?.toString() || '',
      description: room.description || '',
      status: room.status,
    });
    editModal.onOpen();
  };

  const handleCreateRoom = async () => {
    if (!roomForm.name || !roomForm.type || !roomForm.location) {
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
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomForm,
          capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      toast({
        title: 'Success',
        description: 'Room created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setRoomForm({
        name: '',
        type: '',
        location: '',
        capacity: '',
        description: '',
        status: 'AVAILABLE',
      });
      fetchRooms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create room.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUpdateRoom = async () => {
    if (!selectedRoom) return;

    if (!roomForm.name || !roomForm.type || !roomForm.location) {
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
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomForm,
          capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update room');
      }

      toast({
        title: 'Success',
        description: 'Room updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      editModal.onClose();
      setSelectedRoom(null);
      fetchRooms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update room.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete room');
      }

      toast({
        title: 'Success',
        description: 'Room deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchRooms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete room.',
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
          <Text>Loading rooms...</Text>
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
            onClick={handleOpenCreateModal}
            aria-label="Create new room"
          >
            Create Room
          </Button>
        </Flex>

        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <FaSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by name, location, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search rooms"
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
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Capacity</Th>
                <Th>Status</Th>
                <Th>Reservations</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRooms.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">No rooms found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredRooms.map((room) => (
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
                    <Td>{room.capacity || 'N/A'}</Td>
                    <Td>
                      <Badge
                        colorScheme={ROOM_STATUS_COLORS[room.status]}
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
                      <HStack spacing={2}>
                        <Tooltip label="Edit Room" aria-label="Edit tooltip">
                          <IconButton
                            icon={<FaEdit />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(room)}
                            aria-label={`Edit ${room.name}`}
                          />
                        </Tooltip>
                        <Tooltip label="Delete Room" aria-label="Delete tooltip">
                          <IconButton
                            icon={<FaTrash />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleDeleteRoom(room.id)}
                            aria-label={`Delete ${room.name}`}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>

        <Text color="gray.500" fontSize="sm">
          Showing {filteredRooms.length} of {rooms.length} rooms
        </Text>
      </VStack>

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

      {/* Create Room Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create New Room</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  placeholder="Room name"
                  aria-label="Room name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={roomForm.type}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, type: e.target.value })
                  }
                  placeholder="Select room type"
                  aria-label="Room type"
                >
                  {ROOM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Location</FormLabel>
                <Input
                  value={roomForm.location}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, location: e.target.value })
                  }
                  placeholder="Building, floor, etc."
                  aria-label="Room location"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Capacity</FormLabel>
                <NumberInput
                  value={roomForm.capacity}
                  onChange={(value) =>
                    setRoomForm({ ...roomForm, capacity: value })
                  }
                  min={1}
                >
                  <NumberInputField placeholder="Number of seats" aria-label="Room capacity" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={roomForm.description}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, description: e.target.value })
                  }
                  placeholder="Room description"
                  aria-label="Room description"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={roomForm.status}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, status: e.target.value })
                  }
                  aria-label="Room status"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateRoom}>
              Create Room
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Edit Room</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  aria-label="Room name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={roomForm.type}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, type: e.target.value })
                  }
                  aria-label="Room type"
                >
                  {ROOM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Location</FormLabel>
                <Input
                  value={roomForm.location}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, location: e.target.value })
                  }
                  aria-label="Room location"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Capacity</FormLabel>
                <NumberInput
                  value={roomForm.capacity}
                  onChange={(value) =>
                    setRoomForm({ ...roomForm, capacity: value })
                  }
                  min={1}
                >
                  <NumberInputField aria-label="Room capacity" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={roomForm.description}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, description: e.target.value })
                  }
                  aria-label="Room description"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={roomForm.status}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, status: e.target.value })
                  }
                  aria-label="Room status"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateRoom}>
              Update Room
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

