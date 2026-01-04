import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

/**
 * GET /api/enrollments - Get enrollments
 * Students see their own enrollments, others see all
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
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status');

    // Build where clause
    const where = {};

    // Students can only see their own enrollments
    if (currentUser.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: currentUser.id },
      });
      if (student) {
        where.studentId = student.id;
      } else {
        return NextResponse.json({ enrollments: [] });
      }
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (status) {
      where.status = status;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                userCode: true,
                email: true,
              },
            },
          },
        },
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                userCode: true,
                email: true,
                staff: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enrollments - Enroll student in a course (Student only for electives)
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

    if (currentUser.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Forbidden: Only students can enroll in courses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing required field: courseId' },
        { status: 400 }
      );
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { id: currentUser.id },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      );
    }

    // Check if course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (course.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot enroll in archived course' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: courseId,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'Already enrolled in this course' },
          { status: 409 }
        );
      }
      // If previously dropped, reactivate enrollment
      const enrollment = await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'ACTIVE', enrolledAt: new Date() },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  userCode: true,
                  email: true,
                },
              },
            },
          },
          course: {
            include: {
              instructor: {
                select: {
                  id: true,
                  userCode: true,
                  email: true,
                  staff: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      return NextResponse.json({ enrollment }, { status: 200 });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: courseId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                userCode: true,
                email: true,
              },
            },
          },
        },
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                userCode: true,
                email: true,
                staff: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

