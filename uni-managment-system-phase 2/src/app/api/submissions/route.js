import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STUDENT_ROLE = 'STUDENT';
const INSTRUCTOR_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

const normalizeType = (type) => {
  if (!type) return null;
  const t = String(type).toUpperCase();
  if (t === 'ASSIGNMENT' || t === 'QUIZ' || t === 'EXAM') return t;
  return null;
};

export async function GET(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const type = normalizeType(searchParams.get('type'));
    const status = searchParams.get('status');

    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;

    if (currentUser.role === STUDENT_ROLE) {
      const student = await prisma.student.findUnique({ where: { id: currentUser.id } });
      if (!student) return NextResponse.json({ submissions: [] });

      where.studentId = student.id;

      if (courseId) {
        // Filter submissions by course by ensuring the related item belongs to the course
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { enrollments: { where: { studentId: student.id, status: 'ACTIVE' }, select: { id: true } } },
        });

        if (!course || course.enrollments.length === 0) {
          return NextResponse.json({ error: 'Forbidden: Not enrolled in this course' }, { status: 403 });
        }

        where.OR = [
          { assignment: { courseId } },
          { quiz: { courseId } },
          { exam: { courseId } },
        ];
      }
    } else if (INSTRUCTOR_ROLES.includes(currentUser.role)) {
      if (!courseId) {
        return NextResponse.json(
          { error: 'courseId is required for instructor submissions view' },
          { status: 400 }
        );
      }

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      if (course.instructorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the course instructor can view submissions' },
          { status: 403 }
        );
      }

      where.OR = [
        { assignment: { courseId } },
        { quiz: { courseId } },
        { exam: { courseId } },
      ];
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
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
            course: { select: { id: true, code: true, name: true } },
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        grade: {
          select: {
            id: true,
            score: true,
            maxScore: true,
            status: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== STUDENT_ROLE) {
      return NextResponse.json({ error: 'Forbidden: Student access required' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({ where: { id: currentUser.id } });
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    let type = null;
    let assignmentId = null;
    let quizId = null;
    let examId = null;
    let content = null;
    let uploadedFile = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      type = normalizeType(formData.get('type'));
      assignmentId = formData.get('assignmentId') ? String(formData.get('assignmentId')) : null;
      quizId = formData.get('quizId') ? String(formData.get('quizId')) : null;
      examId = formData.get('examId') ? String(formData.get('examId')) : null;
      content = formData.get('content') ? String(formData.get('content')) : null;
      uploadedFile = formData.get('file');
    } else {
      const body = await request.json();
      type = normalizeType(body.type);
      assignmentId = body.assignmentId || null;
      quizId = body.quizId || null;
      examId = body.examId || null;
      content = body.content || null;
    }

    if (!type) {
      return NextResponse.json({ error: 'Invalid type. Must be ASSIGNMENT, QUIZ, or EXAM' }, { status: 400 });
    }

    const idsProvided = [assignmentId, quizId, examId].filter(Boolean).length;
    if (idsProvided !== 1) {
      return NextResponse.json(
        { error: 'Provide exactly one of: assignmentId, quizId, examId' },
        { status: 400 }
      );
    }

    if (contentType.includes('multipart/form-data')) {
      if (!uploadedFile || typeof uploadedFile.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }
    }

    let courseId = null;

    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      courseId = assignment.courseId;
    }

    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { course: true },
      });
      if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      courseId = quiz.courseId;
    }

    if (examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: { course: true },
      });
      if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
      courseId = exam.courseId;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        studentId: student.id,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Forbidden: You are not enrolled in this course' },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findFirst({
      where: {
        studentId: student.id,
        ...(assignmentId ? { assignmentId } : {}),
        ...(quizId ? { quizId } : {}),
        ...(examId ? { examId } : {}),
      },
    });

    let fileData = {
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileSize: null,
    };

    if (contentType.includes('multipart/form-data')) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'submissions');
      await fs.mkdir(uploadsDir, { recursive: true });

      const originalName = uploadedFile?.name ? String(uploadedFile.name) : 'submission';
      const ext = path.extname(originalName);
      const safeExt = ext && ext.length <= 16 ? ext : '';
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;

      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      await fs.writeFile(path.join(uploadsDir, uniqueName), buffer);

      fileData = {
        fileUrl: `/uploads/submissions/${uniqueName}`,
        fileName: originalName,
        fileType: uploadedFile.type ? String(uploadedFile.type) : null,
        fileSize: buffer.length,
      };
    }

    const submission = existing
      ? await prisma.submission.update({
          where: { id: existing.id },
          data: {
            type,
            content: content || null,
            ...fileData,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
          include: {
            assignment: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
            quiz: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
            exam: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
          },
        })
      : await prisma.submission.create({
          data: {
            studentId: student.id,
            type,
            assignmentId: assignmentId || null,
            quizId: quizId || null,
            examId: examId || null,
            content: content || null,
            ...fileData,
            status: 'SUBMITTED',
          },
          include: {
            assignment: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
            quiz: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
            exam: { select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } } },
          },
        });

    return NextResponse.json({ submission }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
