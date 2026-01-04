import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to manage student records
const ALLOWED_ROLES = ['STUDENT_AFFAIRS_OFFICER'];

/**
 * GET /api/students - Get all students with optional search
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

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { userCode: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const students = await prisma.student.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students - Create a new student record (Student Affairs Officer only)
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
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address,
      enrollmentDate,
      graduationDate,
      gpa,
      status,
    } = body;

    // Validate required fields
    if (!userId || !firstName || !lastName || !dateOfBirth || !enrollmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, firstName, lastName, dateOfBirth, enrollmentDate' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if student record already exists for this user
    const existingStudent = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student record already exists for this user' },
        { status: 409 }
      );
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, GRADUATED, SUSPENDED, or WITHDRAWN' },
        { status: 400 }
      );
    }

    // Create student record
    const student = await prisma.student.create({
      data: {
        id: userId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        phoneNumber: phoneNumber || null,
        address: address || null,
        enrollmentDate: new Date(enrollmentDate),
        graduationDate: graduationDate ? new Date(graduationDate) : null,
        gpa: gpa ? parseFloat(gpa) : 0.0,
        status: status || 'ACTIVE',
      },
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
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Student record already exists for this user' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

