"use client";
import { useEffect, useState } from "react";
import { getAllRooms, getStudentRooms } from "../../src/lib/firestoreService";
import { useUser } from "../../src/hooks/useUser";
import { Box, Grid, Heading, Text } from "@chakra-ui/react";
import RoomCard from "../../src/components/RoomCard";

  const page = ()=> {
  const user = useUser();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (!user) { setRooms([]); setLoading(false); return; }
      try {
        if (user.role === "student") {
          const r = await getStudentRooms(user.uid);
          setRooms(r);
        } else {
          const r = await getAllRooms();
          setRooms(r);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [user]);

  return (
    <Box p="6">
      <Heading size="lg" mb="4">Rooms</Heading>
      {loading ? <Text>Loading…</Text> : (
        rooms.length ? (
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="4">
            {rooms.map(r => <RoomCard key={r.id} room={r} />)}
          </Grid>
        ) : <Text>No rooms found.</Text>
      )}
    </Box>
  );
}

export default page;