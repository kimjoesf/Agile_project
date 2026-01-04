import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to reject requests
const ALLOWED_ROLES = ['ADMIN', 'UNIT_HEAD', 'DEAN', 'DIRECTOR'];

/**
 * PATCH /api/room-requests/[id]/reject - Reject a room request (Admin, Unit Head, Dean, or Director only)
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
        { error: 'Forbidden: Admin, Unit Head, Dean, or Director access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { rejectionReason } = body;

    // Find the request
    const roomRequest = await prisma.roomRequest.findUnique({
      where: { id },
    });

    if (!roomRequest) {
      return NextResponse.json(
        { error: 'Room request not found' },
        { status: 404 }
      );
    }

    // Check if request is pending
    if (roomRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be rejected' },
        { status: 400 }
      );
    }

    // Update request status to rejected
    const updatedRequest = await prisma.roomRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reason: rejectionReason || roomRequest.reason,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            userCode: true,
          },
        },
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Error rejecting room request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

