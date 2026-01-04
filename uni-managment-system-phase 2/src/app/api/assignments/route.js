import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to create assignments
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * GET /api/assignments - Get assignments
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
    const courseId = searchParams.get('courseId');

    const where = {};
    if (courseId) {
      where.courseId = courseId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            grades: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments - Create an assignment (Professor or TA only)
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
    const { courseId, title, description, deadline, maxScore } = body;

    // Validate required fields
    if (!courseId || !title || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, deadline' },
        { status: 400 }
      );
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is the instructor or the assigned teaching assistant
    if (course.instructorId !== currentUser.id && course.teachingAssistantId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the course instructor or assigned teaching assistant can create assignments' },
        { status: 403 }
      );
    }

    // Validate deadline
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid deadline format' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || null,
        deadline: deadlineDate,
        maxScore: maxScore ? parseFloat(maxScore) : 100.0,
    
        course: {
          connect: {
            id: courseId, // MUST be Course.id
          },
        },
    
        creator: {
          connect: {
            id: currentUser.id,
          },
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

