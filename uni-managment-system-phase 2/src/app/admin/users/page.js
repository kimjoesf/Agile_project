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
} from '@chakra-ui/react';
import { FaSearch, FaPlus, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'TEACHING_ASSISTANT', label: 'Teaching Assistant' },
  { value: 'UNIT_HEAD', label: 'Unit Head' },
  { value: 'STUDENT_AFFAIRS_OFFICER', label: 'Student Affairs Officer' },
  { value: 'DEAN', label: 'Dean' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PARENT', label: 'Parent' },
];

const STATUS_COLORS = {
  ACTIVE: 'green',
  DISABLED: 'red',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const toast = useToast();

  // Modals
  const createModal = useDisclosure();
  const editRoleModal = useDisclosure();
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    role: '',
    clerkUserId: '',
  });
  const [editRole, setEditRole] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You must be an admin to access this page.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Search and filter
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.userCode.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredUsers(filtered);
  }, [searchTerm, users, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Create user
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.role || !createForm.clerkUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: 'Success',
        description: 'User created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
      setCreateForm({ email: '', role: '', clerkUserId: '' });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Update role
  const handleUpdateRole = async () => {
    if (!editRole) {
      toast({
        title: 'Validation Error',
        description: 'Please select a role.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: editRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast({
        title: 'Success',
        description: 'User role updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      editRoleModal.onClose();
      setSelectedUser(null);
      setEditRole('');
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Toggle status
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    try {
      const response = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      toast({
        title: 'Success',
        description: `User ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'} successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Open edit role modal
  const openEditRoleModal = (user) => {
    setSelectedUser(user);
    setEditRole(user.role);
    editRoleModal.onOpen();
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading users...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            User Management
          </Heading>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={createModal.onOpen}
            aria-label="Create new user"
          >
            Create User
          </Button>
        </Flex>

        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <FaSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search by email, user code, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search users"
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
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('userCode')}
                  _hover={{ bg: 'gray.100' }}
                >
                  User Code
                  {sortConfig.key === 'userCode' && (
                    <Text as="span" ml={2}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('email')}
                  _hover={{ bg: 'gray.100' }}
                >
                  Email
                  {sortConfig.key === 'email' && (
                    <Text as="span" ml={2}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('role')}
                  _hover={{ bg: 'gray.100' }}
                >
                  Role
                  {sortConfig.key === 'role' && (
                    <Text as="span" ml={2}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('status')}
                  _hover={{ bg: 'gray.100' }}
                >
                  Status
                  {sortConfig.key === 'status' && (
                    <Text as="span" ml={2}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredUsers.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={8}>
                    <Text color="gray.500">No users found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredUsers.map((user) => (
                  <Tr
                    key={user.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background-color 0.2s"
                  >
                    <Td fontWeight="medium">{user.userCode}</Td>
                    <Td>{user.email}</Td>
                    <Td>
                      <Badge colorScheme="blue" variant="subtle">
                        {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ||
                          user.role}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={STATUS_COLORS[user.status]} variant="solid">
                        {user.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="Edit Role" aria-label="Edit role tooltip">
                          <IconButton
                            icon={<FaEdit />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => openEditRoleModal(user)}
                            aria-label={`Edit role for ${user.email}`}
                          />
                        </Tooltip>
                        <Tooltip
                          label={user.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
                          aria-label="Toggle status tooltip"
                        >
                          <IconButton
                            icon={user.status === 'ACTIVE' ? <FaTimes /> : <FaCheck />}
                            size="sm"
                            colorScheme={user.status === 'ACTIVE' ? 'red' : 'green'}
                            variant="ghost"
                            onClick={() => handleToggleStatus(user)}
                            aria-label={`${user.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${user.email}`}
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
          Showing {filteredUsers.length} of {users.length} users
        </Text>
      </VStack>

      {/* Create User Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Create New User</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  aria-label="User email"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value })
                  }
                  placeholder="Select role"
                  aria-label="User role"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Clerk User ID</FormLabel>
                <Input
                  value={createForm.clerkUserId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, clerkUserId: e.target.value })
                  }
                  placeholder="user_xxxxxxxxxxxxx"
                  aria-label="Clerk user ID"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateUser}>
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={editRoleModal.isOpen}
        onClose={editRoleModal.onClose}
        size="md"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Edit User Role</ModalHeader>
          <ModalCloseButton aria-label="Close modal" />
          <ModalBody>
            {selectedUser && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    User: {selectedUser.email}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Current Role: {ROLE_OPTIONS.find((r) => r.value === selectedUser.role)?.label}
                  </Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel>New Role</FormLabel>
                  <Select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    aria-label="Select new role"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editRoleModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateRole}>
              Update Role
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

