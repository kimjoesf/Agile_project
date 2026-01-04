import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { checkRoomConflict } from '@/libs/roomConflict';

// Roles allowed to approve/reject requests
const ALLOWED_ROLES = ['ADMIN', 'UNIT_HEAD', 'DEAN', 'DIRECTOR'];

/**
 * PATCH /api/room-requests/[id]/approve - Approve a room request (Admin, Unit Head, Dean, or Director only)
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

    // Find the request
    const roomRequest = await prisma.roomRequest.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            status: true,
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

    // Check if request is pending
    if (roomRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be approved' },
        { status: 400 }
      );
    }

    // Check for conflicts before approving
    const conflictCheck = await checkRoomConflict(
      roomRequest.roomId,
      roomRequest.date,
      roomRequest.startTime,
      roomRequest.endTime,
      id // Exclude this request from conflict check
    );

    if (conflictCheck.hasConflict) {
      return NextResponse.json(
        {
          error: conflictCheck.conflictDetails.message,
          conflictType: conflictCheck.conflictType,
        },
        { status: 409 }
      );
    }

    // Use transaction to update request and create booking atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update request status to approved
      const updatedRequest = await tx.roomRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
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

      // Create booking from approved request
      const booking = await tx.booking.create({
        data: {
          roomId: roomRequest.roomId,
          userId: roomRequest.requesterId,
          date: roomRequest.date,
          startTime: roomRequest.startTime,
          endTime: roomRequest.endTime,
          status: 'ACTIVE',
        },
      });

      return { request: updatedRequest, booking };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error approving room request:', error);
    
    // Handle unique constraint violation (duplicate booking)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Booking already exists for this time slot' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

