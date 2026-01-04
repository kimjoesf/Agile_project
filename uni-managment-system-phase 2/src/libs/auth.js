import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from './prisma';

/**
 * Gets the current authenticated user with their role from the database
 * @returns {Promise<{id: string, email: string, role: string, status: string, userCode: string} | null>}
 */
export async function getCurrentUserWithRole() {
  try {
    // Get Clerk user ID from session
    const { userId } = await auth();
    
    if (!userId) {
      return null;
    }

    // Fetch user from database using Clerk user ID (which is stored as id)
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        userCode: true,
      },
    });

    // Check if user exists and is active
    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error fetching current user with role:', error);
    return null;
  }
}

/**
 * Gets the current Clerk user object
 * @returns {Promise<import('@clerk/nextjs/server').User | null>}
 */
export async function getCurrentClerkUser() {
  try {
    return await currentUser();
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

