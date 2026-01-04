import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

/**
 * PATCH /api/users/[id]/role - Update user role (Admin only)
 */
export async function PATCH(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate input
    if (!role) {
      return NextResponse.json(
        { error: 'Missing required field: role' },
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
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

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

