import prisma from './prisma';

/**
 * Checks if a time slot conflicts with existing bookings or approved requests
 * @param {string} roomId - Room ID
 * @param {Date} date - Date of the booking
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {string} excludeRequestId - Optional: exclude a specific request ID (for updates)
 * @returns {Promise<{hasConflict: boolean, conflictType: string, conflictDetails: object|null}>}
 */
export async function checkRoomConflict(roomId, date, startTime, endTime, excludeRequestId = null) {
  // Validate time range
  if (startTime >= endTime) {
    return {
      hasConflict: true,
      conflictType: 'INVALID_TIME_RANGE',
      conflictDetails: { message: 'Start time must be before end time' },
    };
  }

  // Check if room exists and is available
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    return {
      hasConflict: true,
      conflictType: 'ROOM_NOT_FOUND',
      conflictDetails: { message: 'Room not found' },
    };
  }

  if (room.status === 'MAINTENANCE') {
    return {
      hasConflict: true,
      conflictType: 'ROOM_MAINTENANCE',
      conflictDetails: { message: 'Room is under maintenance' },
    };
  }

  // Normalize dates to same day for comparison
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  // Check for conflicts with active bookings
  // Two time slots overlap if: newStart < existingEnd AND newEnd > existingStart
  const bookingConflicts = await prisma.booking.findMany({
    where: {
      roomId,
      status: 'ACTIVE',
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
      AND: [
        { startTime: { lt: endTime } }, // Existing booking ends after new booking starts
        { endTime: { gt: startTime } },  // Existing booking starts before new booking ends
      ],
    },
  });

  if (bookingConflicts.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'BOOKING_CONFLICT',
      conflictDetails: {
        message: 'Time slot conflicts with existing booking',
        conflicts: bookingConflicts,
      },
    };
  }

  // Check for conflicts with approved OR pending requests (to prevent overlaps & duplicate pending queue)
  const approvedRequestConflicts = await prisma.roomRequest.findMany({
    where: {
      roomId,
      status: { in: ['APPROVED', 'PENDING'] },
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      AND: [
        { startTime: { lt: endTime } }, // Existing request ends after new request starts
        { endTime: { gt: startTime } },  // Existing request starts before new request ends
      ],
    },
  });

  if (approvedRequestConflicts.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'APPROVED_REQUEST_CONFLICT',
      conflictDetails: {
        message: 'Time slot conflicts with approved request',
        conflicts: approvedRequestConflicts,
      },
    };
  }

  return {
    hasConflict: false,
    conflictType: null,
    conflictDetails: null,
  };
}

