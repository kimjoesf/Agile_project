import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { generateUserCode } from '@/libs/userCode';

// Roles allowed to view admissions
const VIEW_ROLES = ['STUDENT_AFFAIRS_OFFICER', 'DEAN', 'DIRECTOR'];

// Roles allowed to create admissions
const CREATE_ROLES = ['STUDENT_AFFAIRS_OFFICER'];

/**
 * GET /api/admissions - Get all admission requests
 */
export async function GET(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!VIEW_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer, Dean, or Director access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        {
          applicant: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { userCode: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const admissions = await prisma.admission.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ admissions });
  } catch (error) {
    console.error('Error fetching admissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admissions - Create an admission request (Student Affairs Officer only)
 * Creates a User with STUDENT role and PENDING status, and creates the Admission record.
 */
export async function POST(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!CREATE_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      clerkUserId,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address,
      notes,
    } = body;

    if (!email || !clerkUserId || !firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required fields: email, clerkUserId, firstName, lastName, dateOfBirth' },
        { status: 400 }
      );
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dateOfBirth format' },
        { status: 400 }
      );
    }

    // Ensure user does not already exist
    const existingUser = await prisma.user.findUnique({
      where: { id: clerkUserId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this Clerk ID already exists' },
        { status: 409 }
      );
    }

    // Ensure email is unique
    const existingEmail = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const userCode = await generateUserCode('STUDENT');

      const user = await tx.user.create({
        data: {
          id: clerkUserId,
          userCode,
          email,
          role: 'STUDENT',
          status: 'PENDING',
        },
        select: {
          id: true,
          userCode: true,
          email: true,
          role: true,
          status: true,
        },
      });

      const admission = await tx.admission.create({
        data: {
          userId: user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob,
          phoneNumber: phoneNumber || null,
          address: address || null,
          status: 'PENDING',
          notes: notes || null,
        },
        include: {
          applicant: {
            select: {
              id: true,
              userCode: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return { user, admission };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating admission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

