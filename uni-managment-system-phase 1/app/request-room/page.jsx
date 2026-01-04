"use client";
import { useEffect, useState } from "react";
import { Box, Heading, Input, Select, Button, VStack, Text } from "@chakra-ui/react";
import { useUser } from "../../hooks/useUser";
import { getAllRooms } from "../../libs/helpers/room";
import { createRoomRequest } from "../../libs/helpers/requests";
import { useRouter } from "next/navigation";

const page = () => {
  const user = useUser();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [dateISO, setDateISO] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function load() {
      const r = await getAllRooms();
      setRooms(r);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    if (!user) return setErr("Sign in first");
    if (user.role !== "professor") return setErr("Only professors can request rooms");
    try {
      await createRoomRequest({ roomId, professorId: user.uid, courseId, dateISO, startTime, endTime });
      setOk("Request submitted and pending approval.");
      // reset or go to my requests
      router.push("/my-requests");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <Box p="6" maxW="md">
      <Heading size="md" mb="4">Request a Room</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing="3">
          <Select placeholder="Select room" value={roomId} onChange={(e)=>setRoomId(e.target.value)}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — {r.type}</option>)}
          </Select>
          <Input placeholder="Course ID (e.g. CSE101)" value={courseId} onChange={(e)=>setCourseId(e.target.value)} />
          <Input type="date" value={dateISO} onChange={(e)=>setDateISO(e.target.value)} />
          <Input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} />
          <Input type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} />
          <Button type="submit" colorScheme="blue">Submit Request</Button>
          {err && <Text color="red.500">{err}</Text>}
          {ok && <Text color="green.600">{ok}</Text>}
        </VStack>
      </form>
    </Box>
  );

}

export default page;