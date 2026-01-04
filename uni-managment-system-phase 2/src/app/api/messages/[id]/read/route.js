import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

/**
 * PATCH /api/messages/[id]/read - Mark message as read
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

    const { id } = await params;

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user is the receiver
    if (message.receiverId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only mark your own received messages as read' },
        { status: 403 }
      );
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userCode: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

