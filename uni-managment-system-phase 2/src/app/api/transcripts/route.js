import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { generateTranscriptPDF } from '@/libs/transcriptPdf';
import supabase from '@/libs/supabase';
import { getTranscriptCourses, setTranscriptCourses } from '@/libs/eav';

// Roles allowed to generate transcripts
const ALLOWED_ROLES = ['STUDENT_AFFAIRS_OFFICER'];

/**
 * GET /api/transcripts - Get all transcripts (Student Affairs Officer only)
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

    if (!ALLOWED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const transcripts = await prisma.transcript.findMany({
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
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    // Add courses from EAV to each transcript
    const transcriptsWithCourses = await Promise.all(
      transcripts.map(async (transcript) => {
        const courses = await getTranscriptCourses(transcript.id);
        return {
          ...transcript,
          courses: courses,
        };
      })
    );

    return NextResponse.json({ transcripts: transcriptsWithCourses }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transcripts - Generate transcript data and PDF for a student (Student Affairs Officer only)
 * Generates PDF transcript, uploads to Supabase Storage, and saves file reference in database
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
        { error: 'Forbidden: Student Affairs Officer access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, courses, gpa } = body;

    // Validate required fields
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing required field: studentId' },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            userCode: true,
            email: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get courses from enrollments if not provided
    let validatedCourses = [];
    let calculatedGPA = 0;

    if (courses && Array.isArray(courses) && courses.length > 0) {
      // Use provided courses
      let totalPoints = 0;
      let totalCredits = 0;

      validatedCourses = courses.map((course) => {
        const creditHours = parseFloat(course.creditHours) || 0;
        const grade = parseFloat(course.grade) || 0;
        
        totalPoints += grade * creditHours;
        totalCredits += creditHours;

        return {
          courseCode: course.courseCode || '',
          courseName: course.courseName || '',
          creditHours: creditHours,
          grade: grade,
          semester: course.semester || '',
          year: course.year || '',
        };
      });

      calculatedGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;
    } else {
      // Fetch courses from enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          status: 'COMPLETED',
        },
        include: {
          course: true,
          grades: {
            where: {
              status: 'PUBLISHED',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      let totalPoints = 0;
      let totalCredits = 0;

      validatedCourses = enrollments.map((enrollment) => {
        const creditHours = enrollment.course.creditHours || 0;
        const grade = enrollment.grades[0]?.score || 0;
        
        totalPoints += grade * creditHours;
        totalCredits += creditHours;

        return {
          courseCode: enrollment.course.code,
          courseName: enrollment.course.name,
          creditHours: creditHours,
          grade: grade,
          semester: '',
          year: '',
        };
      });

      calculatedGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;
    }

    // Use provided GPA or calculated GPA
    const finalGPA = body.gpa ? parseFloat(body.gpa) : calculatedGPA;

    // Generate PDF transcript
    let pdfPath = null;
    try {
      const pdfBuffer = await generateTranscriptPDF(student, validatedCourses, finalGPA);
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `transcripts/${student.user.userCode}_${timestamp}.pdf`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(filename, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading PDF to Supabase:', uploadError);
        // Continue without PDF if upload fails
      } else {
        // Get public URL for the file
        const { data: urlData } = supabase.storage
          .from('transcripts')
          .getPublicUrl(filename);
        
        pdfPath = urlData.publicUrl || filename;
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      // Continue without PDF if generation fails
    }

    // Create transcript record (without courses field - now in EAV)
    const transcript = await prisma.transcript.create({
      data: {
        studentId,
        gpa: finalGPA,
        pdfPath: pdfPath,
        generatedBy: currentUser.id,
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
      },
    });

    // Store courses in EAV
    await setTranscriptCourses(transcript.id, validatedCourses);

    // Update student GPA if needed
    if (student.gpa !== finalGPA) {
      await prisma.student.update({
        where: { id: studentId },
        data: { gpa: finalGPA },
      });
    }

    return NextResponse.json(
      {
        transcript: {
          ...transcript,
          courses: validatedCourses, // Return parsed courses
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

