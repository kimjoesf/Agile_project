import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';
import prisma from '@/libs/prisma';

/**
 * GET /api/messages - Get messages for current user
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
    const conversationWith = searchParams.get('conversationWith');

    // Build where clause
    const where = {
      OR: [
        { senderId: currentUser.id },
        { receiverId: currentUser.id },
      ],
    };

    if (conversationWith) {
      where.AND = [
        {
          OR: [
            {
              AND: [
                { senderId: currentUser.id },
                { receiverId: conversationWith },
              ],
            },
            {
              AND: [
                { senderId: conversationWith },
                { receiverId: currentUser.id },
              ],
            },
          ],
        },
      ];
    }

    const messages = await prisma.message.findMany({
      where,
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages - Send a message
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

    const body = await request.json();
    const { receiverId, content } = body;

    // Validate required fields
    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: receiverId, content' },
        { status: 400 }
      );
    }

    // Validate content
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Prevent self-messaging
    if (receiverId === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: currentUser.id,
        receiverId: receiverId,
        content: content.trim(),
        read: false,
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

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

