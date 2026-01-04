import { Box, Button, Flex } from '@chakra-ui/react'
import { SignOutButton } from '@clerk/nextjs'

export default function layout({children}) {
  return(
    <Box width={"100vw"} height={"100vh"}>
      {children}
      <Flex position={"absolute"} bottom={5} right={7}>
      <SignOutButton> 
        <Button bg={"red.500"} color={"white"} borderRadius={"full"} padding={2} fontSize={"sm"} fontWeight={"bold"} _hover={{bg:"red.600"}}>Sign Out</Button>
     </SignOutButton>
      </Flex>
    </Box>
  )
}