import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles that can submit leave requests (all staff roles except students)
const STAFF_ROLES = [
  'PROFESSOR',
  'TEACHING_ASSISTANT',
  'UNIT_HEAD',
  'STUDENT_AFFAIRS_OFFICER',
  'DEAN',
  'DIRECTOR',
  'ADMIN',
];

/**
 * GET /api/leave-requests - Get leave requests
 * Staff see their own requests, deans/directors see all
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
    const staffId = searchParams.get('staffId');

    // Build where clause
    const where = {};

    const isApprover = ['DEAN', 'DIRECTOR'].includes(currentUser.role);

    // Non-approver staff members see only their own requests
    if (!isApprover) {
      const staff = await prisma.staff.findUnique({ where: { id: currentUser.id } });
      if (!staff) {
        return NextResponse.json({ leaveRequests: [] });
      }
      where.staffId = staff.id;
    }

    // Deans can see all requests
    if (currentUser.role === 'DEAN') {
      if (staffId) where.staffId = staffId;
    }

    // Directors can see all EXCEPT director-submitted leave requests
    if (currentUser.role === 'DIRECTOR') {
      if (staffId) where.staffId = staffId;
      where.staff = { user: { role: { not: 'DIRECTOR' } } };
    }

    if (status) {
      where.status = status;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ leaveRequests });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leave-requests - Submit a leave request (Staff only)
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

    if (!STAFF_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Staff access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, reason } = body;

    // Validate required fields
    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: startDate, endDate, reason' },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate date range
    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get staff record
    const staff = await prisma.staff.findUnique({
      where: { id: currentUser.id },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff record not found' },
        { status: 404 }
      );
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        staffId: staff.id,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: 'PENDING',
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
      },
    });

    return NextResponse.json({ leaveRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

