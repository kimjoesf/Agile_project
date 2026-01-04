import prisma from './prisma';

/**
 * Role prefix mapping for userCode generation
 */
const ROLE_PREFIXES = {
  STUDENT: 'St',
  PROFESSOR: 'Ps',
  PARENT: 'Pr',
  DIRECTOR: 'Dr',
  DEAN: 'Dn',
  ADMIN: 'Ad',
  TEACHING_ASSISTANT: 'Ta',
  UNIT_HEAD: 'Uh',
  STUDENT_AFFAIRS_OFFICER: 'Sa',
};

/**
 * Generates a unique userCode for a given role
 * Format: <RolePrefix><YY><4-digit sequence>
 * Example: St250001 (Student joined in 2025, sequence 0001)
 * 
 * @param {string} role - User role from UserRole enum
 * @returns {Promise<string>} Generated userCode
 */
export async function generateUserCode(role) {
  const rolePrefix = ROLE_PREFIXES[role];
  if (!rolePrefix) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Get current year (YY format)
  const currentYear = new Date().getFullYear();
  const yy = currentYear.toString().slice(-2);

  // Use Prisma transaction to handle concurrency safely
  return await prisma.$transaction(async (tx) => {
    // Find all users with the same role and YY
    const existingUsers = await tx.user.findMany({
      where: {
        userCode: {
          startsWith: `${rolePrefix}${yy}`,
        },
      },
      select: {
        userCode: true,
      },
      orderBy: {
        userCode: 'desc',
      },
    });

    // Extract sequence numbers and find the max
    let maxSequence = 0;
    if (existingUsers.length > 0) {
      const sequences = existingUsers.map((user) => {
        // Extract sequence from userCode (last 4 digits)
        const sequenceStr = user.userCode.slice(-4);
        return parseInt(sequenceStr, 10);
      });
      maxSequence = Math.max(...sequences);
    }

    // Increment sequence
    const nextSequence = maxSequence + 1;

    // Format sequence as 4-digit string with leading zeros
    const sequenceStr = nextSequence.toString().padStart(4, '0');

    // Generate userCode
    const userCode = `${rolePrefix}${yy}${sequenceStr}`;

    return userCode;
  });
}

