import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to manage rooms
const ALLOWED_ROLES = ['ADMIN', 'UNIT_HEAD'];

/**
 * GET /api/rooms/[id] - Get a specific room
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

    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: 'ACTIVE',
            date: { gte: new Date() },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
            userId: true,
          },
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'ACTIVE',
                date: { gte: new Date() },
              },
            },
            roomRequests: {
              where: {
                status: 'PENDING',
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rooms/[id] - Update a room (Admin or Unit Head only)
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
        { error: 'Forbidden: Admin or Unit Head access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, type, location, capacity, description, status } = body;

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Validate room type if provided
    if (type) {
      const validTypes = [
        'LECTURE_HALL',
        'LABORATORY',
        'SEMINAR_ROOM',
        'OFFICE',
        'MEETING_ROOM',
        'AUDITORIUM',
      ];

      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid room type' },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status && status !== 'AVAILABLE' && status !== 'MAINTENANCE') {
      return NextResponse.json(
        { error: 'Invalid status. Must be AVAILABLE or MAINTENANCE' },
        { status: 400 }
      );
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== existingRoom.name) {
      const nameExists = await prisma.room.findFirst({
        where: {
          name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Room with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update room
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (description !== undefined) updateData.description = description || null;
    if (status !== undefined) updateData.status = status;

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rooms/[id] - Delete a room (Admin or Unit Head only)
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
        { error: 'Forbidden: Admin or Unit Head access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check for future bookings
    const futureBookings = await prisma.booking.findFirst({
      where: {
        roomId: id,
        status: 'ACTIVE',
        date: { gte: new Date() },
      },
    });

    if (futureBookings) {
      return NextResponse.json(
        { error: 'Cannot delete room with future bookings' },
        { status: 400 }
      );
    }

    // Delete room (cascade will handle related records)
    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Room deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

