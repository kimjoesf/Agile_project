import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to manage student records
const ALLOWED_ROLES = ['STUDENT_AFFAIRS_OFFICER'];

/**
 * GET /api/students/[id] - Get a specific student record
 */
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
        transcripts: {
          orderBy: {
            generatedAt: 'desc',
          },
          take: 5, // Get latest 5 transcripts
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/students/[id] - Update a student record (Student Affairs Officer only)
 */
export async function PATCH(request, { params }) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address,
      enrollmentDate,
      graduationDate,
      gpa,
      status,
    } = body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, GRADUATED, SUSPENDED, or WITHDRAWN' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (address !== undefined) updateData.address = address || null;
    if (enrollmentDate !== undefined) updateData.enrollmentDate = new Date(enrollmentDate);
    if (graduationDate !== undefined) updateData.graduationDate = graduationDate ? new Date(graduationDate) : null;
    if (gpa !== undefined) updateData.gpa = gpa ? parseFloat(gpa) : null;
    if (status !== undefined) updateData.status = status;

    // Update student record
    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/students/[id] - Delete a student record (Student Affairs Officer only)
 */
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Delete student record (cascade will handle related records)
    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Student record deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

