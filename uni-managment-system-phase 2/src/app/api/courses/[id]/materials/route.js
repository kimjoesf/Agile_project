import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';
import supabase from '@/libs/supabase';
import { getCourseMaterials, addCourseMaterial } from '@/libs/eav';

// Roles allowed to upload materials
const ALLOWED_ROLES = ['PROFESSOR', 'TEACHING_ASSISTANT'];

/**
 * POST /api/courses/[id]/materials - Upload course materials (Professor or TA only)
 */
export async function POST(request, { params }) {
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

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, code: true, instructorId: true, teachingAssistantId: true },
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
        { error: 'Forbidden: Only the course instructor or assigned teaching assistant can upload materials' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const description = formData.get('description') || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filename = `materials/${course.code}_${timestamp}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to Supabase:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(filename);

    const fileUrl = urlData.publicUrl || filename;

    // Add material to course using EAV
    const newMaterial = {
      filename: file.name,
      url: fileUrl,
      description: description,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.id,
    };

    await addCourseMaterial(id, newMaterial);

    // Fetch updated course
    const updatedCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            userCode: true,
            email: true,
          },
        },
      },
    });

    // Get materials for response
    const materials = await getCourseMaterials(id);

    return NextResponse.json(
      {
        course: {
          ...updatedCourse,
          materials: materials, // Include materials in response
        },
        material: newMaterial,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading course material:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

