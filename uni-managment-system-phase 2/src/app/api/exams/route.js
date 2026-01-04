import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to create exams
const ALLOWED_ROLES = ['PROFESSOR'];

/**
 * GET /api/exams - Get exams
 */
export async function GET(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const where = {};
    if (courseId) {
      where.courseId = courseId;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/exams - Create an exam (Professor or TA only)
 */
export async function POST(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Professor or Teaching Assistant access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courseId, title, description, date, maxScore } = body;

    if (!courseId || !title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, date' },
        { status: 400 }
      );
    }

    const examDate = new Date(date);
    if (isNaN(examDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.instructorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the course instructor can create exams' },
        { status: 403 }
      );
    }

    const exam = await prisma.exam.create({
      data: {
        courseId,
        createdBy: currentUser.id,
        title: title.trim(),
        description: description || null,
        date: examDate,
        maxScore: maxScore ? parseFloat(maxScore) : 100.0,
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

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
