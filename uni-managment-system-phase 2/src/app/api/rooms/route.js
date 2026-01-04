import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to manage rooms
const ALLOWED_ROLES = ['ADMIN', 'UNIT_HEAD'];

/**
 * GET /api/rooms - Get all rooms
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Students should only see rooms assigned to their enrolled courses.
    // There is no direct Room<->Course relation, so we derive assignments from
    // active bookings created by instructors of the student's enrolled courses.
    if (currentUser.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { id: currentUser.id } });
      if (!student) {
        return NextResponse.json({ rooms: [] });
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: 'ACTIVE' },
        include: {
          course: { select: { id: true, code: true, name: true, instructorId: true } },
        },
      });

      const instructorIds = Array.from(
        new Set((enrollments || []).map((e) => e.course?.instructorId).filter(Boolean))
      );

      if (instructorIds.length === 0) {
        return NextResponse.json({ rooms: [] });
      }

      const now = new Date();

      const upcomingBookings = await prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          date: { gte: now },
          userId: { in: instructorIds },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
              capacity: true,
              description: true,
              status: true,
            },
          },
        },
      });

      const coursesByInstructorId = new Map();
      for (const e of enrollments || []) {
        const instructorId = e.course?.instructorId;
        if (!instructorId) continue;
        if (!coursesByInstructorId.has(instructorId)) coursesByInstructorId.set(instructorId, []);
        coursesByInstructorId.get(instructorId).push({
          id: e.course.id,
          code: e.course.code,
          name: e.course.name,
        });
      }

      const roomsMap = new Map();
      for (const b of upcomingBookings) {
        const room = b.room;
        if (!room) continue;
        if (!roomsMap.has(room.id)) {
          roomsMap.set(room.id, { ...room, schedule: [], _count: { bookings: 0 } });
        }

        const entry = roomsMap.get(room.id);
        entry._count.bookings += 1;
        entry.schedule.push({
          id: b.id,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          instructorId: b.userId,
          courses: coursesByInstructorId.get(b.userId) || [],
        });
      }

      const rooms = Array.from(roomsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ rooms });
    }

    const rooms = await prisma.room.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: 'ACTIVE',
                date: { gte: new Date() },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rooms - Create a new room (Admin or Unit Head only)
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
        { error: 'Forbidden: Admin or Unit Head access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, location, capacity, description, status } = body;

    // Validate required fields
    if (!name || !type || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, location' },
        { status: 400 }
      );
    }

    // Validate room type
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

    // Validate status
    if (status && status !== 'AVAILABLE' && status !== 'MAINTENANCE') {
      return NextResponse.json(
        { error: 'Invalid status. Must be AVAILABLE or MAINTENANCE' },
        { status: 400 }
      );
    }

    // Check if room with same name already exists
    const existingRoom = await prisma.room.findFirst({
      where: { name },
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room with this name already exists' },
        { status: 409 }
      );
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name,
        type,
        location,
        capacity: capacity ? parseInt(capacity) : null,
        description: description || null,
        status: status || 'AVAILABLE',
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

