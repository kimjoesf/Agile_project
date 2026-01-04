import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/libs/auth';

/**
 * GET /api/user/current - Get current authenticated user
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUserWithRole();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: currentUser });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

