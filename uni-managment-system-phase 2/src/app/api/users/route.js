import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { generateUserCode } from '@/libs/userCode';

/**
 * GET /api/users - Get all users (Admin only)
 */
export async function GET() {
  try {
    // Check authentication and admin role
    const currentUser = await getCurrentUserWithRole();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all users
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userCode: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user (Admin only)
 */
export async function POST(request) {
  try {
    // Check authentication and admin role
    const currentUser = await getCurrentUserWithRole();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, clerkUserId } = body;

    // Validate input
    if (!email || !role || !clerkUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role, clerkUserId' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = [
      'PARENT',
      'STUDENT',
      'PROFESSOR',
      'TEACHING_ASSISTANT',
      'UNIT_HEAD',
      'STUDENT_AFFAIRS_OFFICER',
      'DEAN',
      'DIRECTOR',
      'ADMIN',
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user with this Clerk ID already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: clerkUserId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this Clerk ID already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate userCode
    const userCode = await generateUserCode(role);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: clerkUserId,
        userCode,
        email,
        role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        userCode: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

