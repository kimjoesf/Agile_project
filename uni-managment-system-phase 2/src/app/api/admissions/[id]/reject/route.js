import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to reject admissions
const ALLOWED_ROLES = ['DEAN', 'DIRECTOR'];

/**
 * PATCH /api/admissions/[id]/reject - Reject an admission request (Dean or Director only)
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
    const body = await request.json();
    const { rejectionNotes, notes } = body;

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
        { error: 'Only pending admissions can be rejected' },
        { status: 400 }
      );
    }

    // Rejecting an admission deletes the user and admission data (per required workflow)
    await prisma.$transaction(async (tx) => {
      await tx.admission.delete({
        where: { id },
      });

      await tx.user.delete({
        where: { id: admission.userId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting admission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

