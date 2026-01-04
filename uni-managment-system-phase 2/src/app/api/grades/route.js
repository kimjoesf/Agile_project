import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

// Roles allowed to grade
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * GET /api/grades - Get grades
 * Students see only their published grades, instructors see all
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
    const assignmentId = searchParams.get('assignmentId');
    const quizId = searchParams.get('quizId');
    const examId = searchParams.get('examId');
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status');

    // Build where clause
    const where = {};

    // Students can only see their own published grades
    if (currentUser.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: currentUser.id },
      });
      if (student) {
        where.studentId = student.id;
        where.status = 'PUBLISHED'; // Students only see published grades
      } else {
        return NextResponse.json({ grades: [] });
      }
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (assignmentId) {
      where.assignmentId = assignmentId;
    }

    if (quizId) {
      where.quizId = quizId;
    }

    if (examId) {
      where.examId = examId;
    }

    if (status) {
      where.status = status;
    }

    // If courseId provided, filter by course assignments/quizzes/exams
    if (courseId && !assignmentId && !quizId && !examId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          assignments: { select: { id: true } },
          quizzes: { select: { id: true } },
          exams: { select: { id: true } },
        },
      });

      if (course) {
        const assignmentIds = course.assignments.map((a) => a.id);
        const quizIds = course.quizzes.map((q) => q.id);
        const examIds = course.exams.map((e) => e.id);
        where.OR = [
          { assignmentId: { in: assignmentIds } },
          { quizId: { in: quizIds } },
          { examId: { in: examIds } },
        ];
      }
    }

    const grades = await prisma.grade.findMany({
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
        assignment: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add student profile fields without changing schema joins elsewhere
    const gradesWithStudentInfo = grades.map((g) => ({
      ...g,
      student: g.student
        ? {
            ...g.student,
            fullName:
              [g.student.firstName, g.student.lastName].filter(Boolean).join(' ') || null,
            studentCode: g.student.user?.userCode || null,
          }
        : g.student,
    }));

    return NextResponse.json({ grades: gradesWithStudentInfo });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/grades - Create or update a grade (Professor or TA only)
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
    const { studentId, assignmentId, quizId, examId, submissionId, score, maxScore, feedback, status } = body;

    // Validate required fields
    if (!studentId || !score || maxScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, score, maxScore' },
        { status: 400 }
      );
    }

    // Exactly one of assignmentId/quizId/examId must be provided
    const targetCount = [assignmentId, quizId, examId].filter(Boolean).length;
    if (targetCount !== 1) {
      return NextResponse.json(
        { error: 'Provide exactly one of: assignmentId, quizId, examId' },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Validate assignment or quiz exists and user is instructor
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        );
      }

      if (assignment.course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can grade' },
          { status: 403 }
        );
      }
    }

    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { course: true },
      });

      if (!quiz) {
        return NextResponse.json(
          { error: 'Quiz not found' },
          { status: 404 }
        );
      }

      if (quiz.course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can grade' },
          { status: 403 }
        );
      }
    }

    if (examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: { course: true },
      });

      if (!exam) {
        return NextResponse.json(
          { error: 'Exam not found' },
          { status: 404 }
        );
      }

      if (exam.course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can grade' },
          { status: 403 }
        );
      }
    }

    // If a submissionId is provided, validate it matches student + target
    if (submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: { include: { course: true } },
          quiz: { include: { course: true } },
          exam: { include: { course: true } },
          student: true,
        },
      });

      if (!submission) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }

      if (submission.studentId !== studentId) {
        return NextResponse.json(
          { error: 'Submission does not belong to this student' },
          { status: 400 }
        );
      }

      if (
        (assignmentId && submission.assignmentId !== assignmentId) ||
        (quizId && submission.quizId !== quizId) ||
        (examId && submission.examId !== examId)
      ) {
        return NextResponse.json(
          { error: 'Submission does not match the graded item' },
          { status: 400 }
        );
      }

      const course = submission.assignment?.course || submission.quiz?.course || submission.exam?.course;
      if (!course || course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can grade this submission' },
          { status: 403 }
        );
      }
    }

    // Validate status
    if (status && status !== 'DRAFT' && status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be DRAFT or PUBLISHED' },
        { status: 400 }
      );
    }

    // Check if grade already exists
    const existingGrade = await prisma.grade.findFirst({
      where: {
        studentId,
        ...(assignmentId ? { assignmentId } : {}),
        ...(quizId ? { quizId } : {}),
        ...(examId ? { examId } : {}),
      },
    });

    let grade;
    if (existingGrade) {
      // Update existing grade
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          score: parseFloat(score),
          maxScore: parseFloat(maxScore),
          feedback: feedback || null,
          status: status || existingGrade.status,
          gradedBy: currentUser.id,
          gradedAt: new Date(),
          submissionId: submissionId || existingGrade.submissionId,
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
          submission: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
            },
          },
        },
      });
    } else {
      // Create new grade
      grade = await prisma.grade.create({
        data: {
          studentId,
          assignmentId: assignmentId || null,
          quizId: quizId || null,
          examId: examId || null,
          score: parseFloat(score),
          maxScore: parseFloat(maxScore),
          feedback: feedback || null,
          status: status || 'DRAFT',
          gradedBy: currentUser.id,
          gradedAt: new Date(),
          submissionId: submissionId || null,
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
          submission: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
            },
          },
        },
      });
    }

    if (submissionId) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'GRADED' },
      });
    }

    return NextResponse.json({ grade }, { status: existingGrade ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating grade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

