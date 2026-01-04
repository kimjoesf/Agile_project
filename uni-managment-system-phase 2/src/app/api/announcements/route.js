import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to create announcements
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT', 'UNIT_HEAD', 'DIRECTOR', 'DEAN'];

/**
 * GET /api/announcements - Get announcements
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
    const type = searchParams.get('type');
    const courseId = searchParams.get('courseId');

    // Build where clause
    const where = {};

    if (type) {
      where.type = type;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    // Students see only published announcements
    // For now, all announcements are visible (can add published field later if needed)

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements - Create an announcement (Professor/TA, Unit Head, Director, or Dean only)
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
        { error: 'Forbidden: Professor/TA, Unit Head, Director, or Dean access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, title, content, courseId } = body;

    // Validate required fields
    if (!type || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, content' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['UNIVERSITY', 'COURSE', 'DEPARTMENT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be UNIVERSITY, COURSE, or DEPARTMENT' },
        { status: 400 }
      );
    }

    // If type is COURSE, courseId is required
    if (type === 'COURSE' && !courseId) {
      return NextResponse.json(
        { error: 'courseId is required for COURSE announcements' },
        { status: 400 }
      );
    }

    // Check if course exists if provided
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        authorId: currentUser.id,
        type,
        title: title.trim(),
        content: content.trim(),
        courseId: courseId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

