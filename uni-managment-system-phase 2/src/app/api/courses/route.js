import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { getCourseMaterials } from '@/libs/eav';

// Roles allowed to manage courses
const ALLOWED_ROLES = ['DIRECTOR', 'UNIT_HEAD', 'ADMIN'];

/**
 * GET /api/courses - Get all courses
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
    const instructorId = searchParams.get('instructorId');
    const search = searchParams.get('search');

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (instructorId) {
      where.instructorId = instructorId;
    } else if (currentUser.role === 'PROFESSOR') {
      // Professors should see only their own courses by default
      where.instructorId = currentUser.id;
    } else if (currentUser.role === 'TEACHING_ASSISTANT') {
      // TAs see courses where they are assigned as TA, and (for backwards-compat) courses where they are the instructor
      where.OR = [{ instructorId: currentUser.id }, { teachingAssistantId: currentUser.id }];
    }

    if (search) {
      const searchOr = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        teachingAssistant: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    // Add materials from EAV to each course
    const coursesWithMaterials = await Promise.all(
      courses.map(async (course) => {
        const materials = await getCourseMaterials(course.id);
        return {
          ...course,
          materials: materials,
        };
      })
    );

    return NextResponse.json({ courses: coursesWithMaterials });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses - Create a new course (Director, Unit Head, or Admin only)
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
        { error: 'Forbidden: Director, Unit Head, or Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, description, creditHours, instructorId, teachingAssistantId, status } = body;

    // Validate required fields
    if (!code || !name || !creditHours || !instructorId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, creditHours, instructorId' },
        { status: 400 }
      );
    }

    // Validate credit hours
    const creditHoursInt = parseInt(creditHours);
    if (isNaN(creditHoursInt) || creditHoursInt <= 0) {
      return NextResponse.json(
        { error: 'Credit hours must be a positive number' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && status !== 'ACTIVE' && status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE or ARCHIVED' },
        { status: 400 }
      );
    }

    // Check if instructor exists
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      return NextResponse.json(
        { error: 'Instructor not found' },
        { status: 404 }
      );
    }

    if (teachingAssistantId) {
      const teachingAssistant = await prisma.user.findUnique({
        where: { id: teachingAssistantId },
        select: { id: true, role: true },
      });

      if (!teachingAssistant) {
        return NextResponse.json({ error: 'Teaching assistant not found' }, { status: 404 });
      }

      if (teachingAssistant.role !== 'TEACHING_ASSISTANT') {
        return NextResponse.json(
          { error: 'Selected teaching assistant must have TEACHING_ASSISTANT role' },
          { status: 400 }
        );
      }
    }

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { code },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course with this code already exists' },
        { status: 409 }
      );
    }

    // Create course
    const course = await prisma.course.create({
      data: {
        code,
        name,
        description: description || null,
        creditHours: creditHoursInt,
        instructorId,
        teachingAssistantId: teachingAssistantId || null,
        status: status || 'ACTIVE',
      },
      include: {
        instructor: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        teachingAssistant: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Course with this code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

