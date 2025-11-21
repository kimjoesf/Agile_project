"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRoomBookings, getAllRooms } from "../../../src/lib/firestoreService";
import { Box, Heading, Text, Grid } from "@chakra-ui/react";
import dayjs from "dayjs";

const page = ({ params })=> {
  const { roomId } = params;
  const [bookings, setBookings] = useState([]);
  const [room, setRoom] = useState(null);

  useEffect(() => {
    async function load() {
      // load room
      const rooms = await getAllRooms();
      const r = rooms.find(x => x.id === roomId);
      setRoom(r || null);

      // compute week range (today -> +6)
      const start = dayjs().startOf("day");
      const end = start.add(6, "day");
      const bookingsRes = await getRoomBookings(roomId, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
      setBookings(bookingsRes);
    }
    load();
  }, [roomId]);

  return (
    <Box p="6">
      <Heading size="md" mb="3">Room Schedule</Heading>
      {room && <Text mb="3">{room.name} • {room.type} • Capacity: {room.capacity}</Text>}
      <Grid templateColumns="repeat(7, 1fr)" gap="2">
        {[...Array(7)].map((_,i) => {
          const day = dayjs().add(i, "day");
          const dayISO = day.format("YYYY-MM-DD");
          const dayBookings = bookings.filter(b => b.dateISO === dayISO);
          return (
            <Box key={i} borderWidth="1px" minH="120px" p="2">
              <Text fontSize="sm" fontWeight="bold">{day.format("ddd DD")}</Text>
              {dayBookings.length ? dayBookings.map(b => (
                <Box key={b.id} mt="2" p="2" bg="gray.50" borderRadius="md">
                  <Text fontSize="sm">{b.startTime} - {b.endTime}</Text>
                  <Text fontSize="xs">Course: {b.courseId}</Text>
                </Box>
              )) : <Text fontSize="xs" color="gray.500" mt="2">No bookings</Text>}
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}

export default page;
