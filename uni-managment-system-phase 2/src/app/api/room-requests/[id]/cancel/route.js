import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to cancel requests
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * PATCH /api/room-requests/[id]/cancel - Cancel a pending room request (Professor or TA only, own requests)
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
        { error: 'Forbidden: Professor or Teaching Assistant access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
 

    // Find the request
    const roomRequest = await prisma.roomRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!roomRequest) {
      return NextResponse.json(
        { error: 'Room request not found' },
        { status: 404 }
      );
    }

    // Check if user owns the request
    if (roomRequest.requesterId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only cancel your own requests' },
        { status: 403 }
      );
    }

    // Check if request is pending
    if (roomRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be cancelled' },
        { status: 400 }
      );
    }

    // Update request status to cancelled
    const updatedRequest = await prisma.roomRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
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
    console.error('Error cancelling room request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

