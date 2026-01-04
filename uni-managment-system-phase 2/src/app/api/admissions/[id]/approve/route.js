import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to approve admissions
const ALLOWED_ROLES = ['DEAN', 'DIRECTOR'];

/**
 * PATCH /api/admissions/[id]/approve - Approve an admission request (Dean or Director only)
 * This creates a student record from the approved admission
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
        { error: 'Forbidden: Dean or Director access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Find the admission
    const admission = await prisma.admission.findUnique({
      where: { id },
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
    });

    if (!admission) {
      return NextResponse.json(
        { error: 'Admission request not found' },
        { status: 404 }
      );
    }

    // Check if admission is pending
    if (admission.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending admissions can be approved' },
        { status: 400 }
      );
    }

    // Check if student record already exists for this user
    const existingStudent = await prisma.student.findUnique({
      where: { id: admission.userId },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student record already exists for this user' },
        { status: 409 }
      );
    }

    // Use transaction to approve admission and create student record atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update admission status to approved
      const updatedAdmission = await tx.admission.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: currentUser.id,
          reviewedAt: new Date(),
        },
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
      });

      // Activate the user account
      await tx.user.update({
        where: { id: admission.userId },
        data: {
          status: 'ACTIVE',
          role: 'STUDENT',
        },
      });

      // Create student record from admission
      const student = await tx.student.create({
        data: {
          id: admission.userId,
          firstName: admission.firstName,
          lastName: admission.lastName,
          dateOfBirth: admission.dateOfBirth,
          phoneNumber: admission.phoneNumber,
          address: admission.address,
          enrollmentDate: new Date(), // Set enrollment date to now
          graduationDate: null,
          gpa: 0.0,
          status: 'ACTIVE',
        },
        include: {
          user: {
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

      return { admission: updatedAdmission, student };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error approving admission:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Student record already exists for this user' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

