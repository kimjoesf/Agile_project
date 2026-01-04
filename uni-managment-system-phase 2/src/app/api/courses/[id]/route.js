import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { getCourseMaterials } from '@/libs/eav';

// Roles allowed to manage courses
const ALLOWED_ROLES = ['DIRECTOR', 'UNIT_HEAD', 'ADMIN'];

/**
 * GET /api/courses/[id] - Get a specific course
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

    const course = await prisma.course.findUnique({
      where: { id },
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
            assignments: true,
            quizzes: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Access control:
    // - Director/Unit Head: always allowed
    // - Professor/TA: only if instructor of the course
    // - Student: only if enrolled (ACTIVE)
    if (ALLOWED_ROLES.includes(currentUser.role)) {
      // allowed
    } else if (currentUser.role === 'PROFESSOR') {
      if (course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can access this course' },
          { status: 403 }
        );
      }
    } else if (currentUser.role === 'TEACHING_ASSISTANT') {
      if (course.instructorId !== currentUser.id && course.teachingAssistantId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor or assigned teaching assistant can access this course' },
          { status: 403 }
        );
      }
    } else if (currentUser.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: course.id,
          studentId: currentUser.id,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (!enrollment) {
        return NextResponse.json(
          { error: 'Forbidden: Only enrolled students can access this course' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get materials from EAV
    const materials = await getCourseMaterials(course.id);

    return NextResponse.json({
      course: {
        ...course,
        materials: materials,
      },
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/courses/[id] - Update or archive a course (Director or Unit Head only)
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
        { error: 'Forbidden: Director or Unit Head access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, creditHours, instructorId, teachingAssistantId, status } = body;

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status && status !== 'ACTIVE' && status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE or ARCHIVED' },
        { status: 400 }
      );
    }

    // Validate credit hours if provided
    if (creditHours !== undefined) {
      const creditHoursInt = parseInt(creditHours);
      if (isNaN(creditHoursInt) || creditHoursInt <= 0) {
        return NextResponse.json(
          { error: 'Credit hours must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Check if instructor exists if provided
    if (instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: instructorId },
      });

      if (!instructor) {
        return NextResponse.json(
          { error: 'Instructor not found' },
          { status: 404 }
        );
      }
    }

    if (teachingAssistantId !== undefined) {
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
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (creditHours !== undefined) updateData.creditHours = parseInt(creditHours);
    if (instructorId !== undefined) updateData.instructorId = instructorId;
    if (teachingAssistantId !== undefined) updateData.teachingAssistantId = teachingAssistantId || null;
    if (status !== undefined) updateData.status = status;

    // Update course
    const course = await prisma.course.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

