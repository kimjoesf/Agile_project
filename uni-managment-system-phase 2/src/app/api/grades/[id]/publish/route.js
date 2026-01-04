import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to publish grades
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * PATCH /api/grades/[id]/publish - Publish a grade (Professor or TA only)
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
        { error: 'Forbidden: Professor or Teaching Assistant access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Find the grade
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        quiz: {
          include: {
            course: true,
          },
        },
        exam: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!grade) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      );
    }

    // Check if user is the instructor
    const course = grade.assignment?.course || grade.quiz?.course || grade.exam?.course;
    if (!course || course.instructorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the course instructor can publish grades' },
        { status: 403 }
      );
    }

    // Update grade status to published
    const updatedGrade = await prisma.grade.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        gradedBy: currentUser.id,
        gradedAt: new Date(),
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
        assignment: {
          select: {
            id: true,
            title: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ grade: updatedGrade });
  } catch (error) {
    console.error('Error publishing grade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

