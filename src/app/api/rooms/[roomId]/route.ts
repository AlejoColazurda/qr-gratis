import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET: Get room status and connected players
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          select: { id: true, name: true, joinedAt: true },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    // Check if current user is the admin
    const user = verifyAuthToken(req);
    const isAdmin = user ? room.adminId === user.id : false;

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        status: room.status,
        allowedSpinner: room.allowedSpinner,
        winnerName: room.winnerName,
        spinAngle: room.spinAngle,
        spinDuration: room.spinDuration,
        targetAngle: room.targetAngle,
        isSpinning: room.isSpinning,
        createdAt: room.createdAt,
        players: room.players
      },
      isAdmin
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener la sala' }, { status: 500 });
  }
}

// POST: Join the room as a player (from mobile or invite link)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'El nombre del jugador es requerido' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'La sala no existe' }, { status: 404 });
    }

    // Check if name is already taken in this room
    const existingPlayer = room.players.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingPlayer) {
      // Just return the existing player if they re-join
      return NextResponse.json({ player: existingPlayer }, { status: 200 });
    }

    // Create the player
    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        roomId: roomId
      }
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al unirse a la sala' }, { status: 500 });
  }
}

// DELETE: Delete/close the room (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const user = verifyAuthToken(req);

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    if (room.adminId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.room.delete({
      where: { id: roomId }
    });

    return NextResponse.json({ success: true, message: 'Sala eliminada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar la sala' }, { status: 500 });
  }
}
