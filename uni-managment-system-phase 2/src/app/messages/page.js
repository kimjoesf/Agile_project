'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Input,
  Button,
  useToast,
  Spinner,
  Center,
  Text,
  Avatar,
  Flex,
  Badge,
  Divider,
  Select,
} from '@chakra-ui/react';
import { FaPaperPlane } from 'react-icons/fa';
import supabase from '@/libs/supabase';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (selectedUser && currentUserId) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchConversations = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      
      // Group messages by conversation partner
      const conversationMap = new Map();
      data.messages.forEach((msg) => {
        const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        const partner = msg.senderId === currentUserId ? msg.receiver : msg.sender;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            userId: partnerId,
            user: partner,
            lastMessage: msg,
            unreadCount: 0,
          });
        }
        
        const conv = conversationMap.get(partnerId);
        if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
          conv.lastMessage = msg;
        }
        if (!msg.read && msg.receiverId === currentUserId) {
          conv.unreadCount++;
        }
      });
      
      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId]);

  const fetchMessages = async (userId) => {
    try {
      const response = await fetch(`/api/messages?conversationWith=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read
      data.messages.forEach((msg) => {
        if (!msg.read && msg.receiverId === currentUserId) {
          fetch(`/api/messages/${msg.id}/read`, { method: 'PATCH' });
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    // Subscribe to new messages using Supabase Realtime
    const channel = supabase
      .channel(`messages:${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `receiverId=eq.${currentUserId}`,
        },
        (payload) => {
          // Fetch updated messages
          fetchMessages(selectedUser.id);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, currentUserId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setSending(true);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: newMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setNewMessage('');
      fetchMessages(selectedUser.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading messages...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8} maxW="1400px" mx="auto" h="calc(100vh - 100px)">
      <VStack spacing={4} align="stretch" h="100%">
        <Heading size="lg" color="gray.700">
          Messages
        </Heading>

        <Flex flex={1} gap={4} overflow="hidden">
          {/* Conversations List */}
          <Box
            w="300px"
            borderWidth="1px"
            borderRadius="lg"
            p={4}
            overflowY="auto"
            bg="white"
            display="flex"
            flexDirection="column"
          >
            <Text fontWeight="bold" mb={3} fontSize="sm" color="gray.700">
              Conversations
            </Text>
            <VStack align="stretch" spacing={2} flex={1} overflowY="auto">
              {conversations.length === 0 ? (
                <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                  No conversations
                </Text>
              ) : (
                conversations.map((conv) => (
                  <Box
                    key={conv.userId}
                    p={3}
                    borderRadius="md"
                    cursor="pointer"
                    bg={selectedUser?.id === conv.userId ? 'blue.50' : 'transparent'}
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => setSelectedUser(conv.user)}
                    transition="background-color 0.2s"
                  >
                    <HStack spacing={3}>
                      <Avatar size="sm" name={conv.user.email} />
                      <VStack align="start" spacing={0} flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                          {conv.user.email}
                        </Text>
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>
                          {conv.lastMessage.content}
                        </Text>
                      </VStack>
                      {conv.unreadCount > 0 && (
                        <Badge mt={6} colorScheme="blue" borderRadius="full">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                ))
              )}
            </VStack>
            <Divider my={3} />
            <Text fontWeight="bold" mb={2} fontSize="sm" color="gray.700">
              Start New Conversation
            </Text>
            <Select
              placeholder="Select user..."
              size="sm"
              onChange={(e) => {
                const userId = e.target.value;
                if (userId) {
                  const user = allUsers.find((u) => u.id === userId);
                  if (user) {
                    setSelectedUser(user);
                    // Check if conversation exists, if not create one by sending a message
                    const existingConv = conversations.find((c) => c.userId === userId);
                    if (!existingConv) {
                      // Will create conversation when first message is sent
                    }
                  }
                }
              }}
              aria-label="Select user to message"
            >
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </Select>
          </Box>

          {/* Messages Area */}
          <Box
            flex={1}
            borderWidth="1px"
            borderRadius="lg"
            display="flex"
            flexDirection="column"
            bg="white"
          >
            {selectedUser ? (
              <>
                {/* Messages Header */}
                <Box p={4} borderBottomWidth="1px">
                  <HStack>
                    <Avatar size="sm" name={selectedUser.email} />
                    <Text fontWeight="medium">{selectedUser.email}</Text>
                    <Badge colorScheme="blue" variant="subtle">
                      {selectedUser.role}
                    </Badge>
                  </HStack>
                </Box>

                {/* Messages List */}
                <Box flex={1} p={4} overflowY="auto">
                  <VStack align="stretch" spacing={3}>
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === currentUserId;
                      return (
                        <Flex
                          key={msg.id}
                          justify={isOwn ? 'flex-end' : 'flex-start'}
                        >
                          <Box
                            maxW="70%"
                            p={3}
                            borderRadius="lg"
                            bg={isOwn ? 'blue.500' : 'gray.100'}
                            color={isOwn ? 'white' : 'gray.800'}
                          >
                            <Text fontSize="sm">{msg.content}</Text>
                            <Text
                              fontSize="xs"
                              color={isOwn ? 'blue.100' : 'gray.500'}
                              mt={1}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </Text>
                          </Box>
                        </Flex>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </VStack>
                </Box>

                {/* Message Input */}
                <Box p={4} borderTopWidth="1px">
                  <HStack>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      aria-label="Message input"
                    />
                    <Button
                      colorScheme="blue"
                      onClick={handleSendMessage}
                      isLoading={sending}
                      leftIcon={<FaPaperPlane />}
                      aria-label="Send message"
                    >
                      Send
                    </Button>
                  </HStack>
                </Box>
              </>
            ) : (
              <Center h="100%">
                <Text color="gray.500">Select a conversation to start messaging</Text>
              </Center>
            )}
          </Box>
        </Flex>
      </VStack>
    </Box>
  );
}

