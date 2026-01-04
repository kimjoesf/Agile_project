// src/components/RoomCard.jsx
"use client";
import { Box, Badge, Heading, Text, Button } from "@chakra-ui/react";
import Link from "next/link";

 const RoomCard = ({ room })=> {
  return (
    <Box borderWidth="1px" borderRadius="md" p="4" bg="white" boxShadow="sm">
      <Heading size="sm">{room.name}</Heading>
      <Text fontSize="sm" mt="2">{room.type} • Capacity: {room.capacity}</Text>
      <Badge mt="2" colorScheme={room.maintenance ? "red" : "green"}>
        {room.maintenance ? "Under maintenance" : "Available"}
      </Badge>
      <Box mt="3">
        <Link href={`/rooms/${room.id}`}>
          <Button size="sm" mt="2">View schedule</Button>
        </Link>
      </Box>
    </Box>
  );
}

export default RoomCard;