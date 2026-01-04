import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { getQuizQuestions, setQuizQuestions } from '@/libs/eav';

// Roles allowed to create quizzes
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * GET /api/quizzes - Get quizzes
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

    const quizzes = await prisma.quiz.findMany({
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
        createdAt: 'desc',
      },
    });

    // Add questions from EAV to each quiz
    const quizzesWithQuestions = await Promise.all(
      quizzes.map(async (quiz) => {
        const questions = await getQuizQuestions(quiz.id);
        return {
          ...quiz,
          questions: questions,
        };
      })
    );

    return NextResponse.json({ quizzes: quizzesWithQuestions });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quizzes - Create a quiz (Professor or TA only)
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
    const { courseId, title, description, questions, timeLimit, maxScore } = body;

    // Validate required fields
    if (!courseId || !title || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, questions' },
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
        { error: 'Forbidden: Only the course instructor or assigned teaching assistant can create quizzes' },
        { status: 403 }
      );
    }

    // Validate questions format
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Questions must be an array' },
        { status: 400 }
      );
    }

    // Create quiz (without questions field - now in EAV)
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        createdBy: currentUser.id,
        title,
        description: description || null,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
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

    // Store questions in EAV
    await setQuizQuestions(quiz.id, questions);

    // Return quiz with questions
    return NextResponse.json(
      {
        quiz: {
          ...quiz,
          questions: questions,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

