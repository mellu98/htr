import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth/user';
import { getSessionCookie, verifySessionToken } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const token = getSessionCookie(request);
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await findUserByEmail(session.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
