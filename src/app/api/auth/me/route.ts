import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const decoded = verifyAuthToken(req);

  if (!decoded) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: decoded.id,
      username: decoded.username,
    },
  });
}
