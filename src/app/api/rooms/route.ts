import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET: List all rooms of the logged in user
export async function GET(req: NextRequest) {
  const user = verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const rooms = await prisma.room.findMany({
      where: { adminId: user.id },
      include: {
        players: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener salas' }, { status: 500 });
  }
}

// POST: Create a new live room
export async function POST(req: NextRequest) {
  const user = verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'El nombre de la sala es requerido' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        adminId: user.id,
        status: 'OPEN',
        allowedSpinner: 'ADMIN',
        isSpinning: false
      }
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al crear la sala' }, { status: 500 });
  }
}
