import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to approve leave requests
const ALLOWED_ROLES = ['DEAN', 'DIRECTOR'];

/**
 * PATCH /api/leave-requests/[id]/approve - Approve a leave request (Dean or Director only)
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

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        staff: {
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
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    if (currentUser.role === 'DIRECTOR' && leaveRequest.staff?.user?.role === 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Forbidden: Director leave requests can only be approved by the Dean' },
        { status: 403 }
      );
    }

    // Check if request is pending
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be approved' },
        { status: 400 }
      );
    }

    // Update leave request status to approved
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      },
      include: {
        staff: {
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
        },
        approver: {
          select: {
            id: true,
            userCode: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ leaveRequest: updatedRequest });
  } catch (error) {
    console.error('Error approving leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

