import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { checkRoomConflict } from '@/libs/roomConflict';

// Roles allowed to request rooms
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * GET /api/room-requests - Get room requests
 * - Professors/TAs see their own requests
 * - Admins/Unit Heads/Deans/Directors see all requests
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const roomId = searchParams.get('roomId');

    // Build where clause
    const where = {};

    // Professors/TAs can only see their own requests
    if (ALLOWED_ROLES.includes(currentUser.role)) {
      where.requesterId = currentUser.id;
    }

    // Admins/Unit Heads/Deans/Directors can see all requests
    // (no additional filter needed)

    if (status) {
      where.status = status;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    const requests = await prisma.roomRequest.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            status: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            userCode: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching room requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/room-requests - Create a room request (Professor or TA only)
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

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Professor or Teaching Assistant access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roomId, date, startTime, endTime, reason } = body;

    // Validate required fields
    if (!roomId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, date, startTime, endTime' },
        { status: 400 }
      );
    }

    // Parse dates
    const requestDate = new Date(date);
    const requestStartTime = new Date(startTime);
    const requestEndTime = new Date(endTime);

    // Validate dates
    if (isNaN(requestDate.getTime()) || isNaN(requestStartTime.getTime()) || isNaN(requestEndTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check for conflicts
    const conflictCheck = await checkRoomConflict(
      roomId,
      requestDate,
      requestStartTime,
      requestEndTime
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

    // Prevent duplicate pending requests by the same requester for the same slot
    const existingPending = await prisma.roomRequest.findFirst({
      where: {
        roomId,
        requesterId: currentUser.id,
        status: 'PENDING',
        date: requestDate,
        startTime: requestStartTime,
        endTime: requestEndTime,
      },
      select: { id: true },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending request for this exact time slot.' },
        { status: 409 }
      );
    }

    // Create room request
    const roomRequest = await prisma.roomRequest.create({
      data: {
        roomId,
        requesterId: currentUser.id,
        date: requestDate,
        startTime: requestStartTime,
        endTime: requestEndTime,
        reason: reason || null,
        status: 'PENDING',
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

    return NextResponse.json({ request: roomRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating room request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

