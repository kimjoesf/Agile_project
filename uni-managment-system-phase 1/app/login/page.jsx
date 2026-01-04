"use client";
import { Box, Button, Input, VStack, Heading, Text } from "@chakra-ui/react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../libs/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

  const page = ()=> {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/rooms");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <Box p="8" maxW="md" mx="auto">
      <VStack spacing="4" align="stretch">
        <Heading size="md">Sign in</Heading>
        <Text color="gray.600">Sign in as a professor, admin or student</Text>
        <Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <Button colorScheme="blue" onClick={handleLogin}>Sign in</Button>
        {err && <Text color="red.500">{err}</Text>}
      </VStack>
    </Box>
  );
}

export default page ;