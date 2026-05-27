import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const body = await req.json().catch(() => ({}));
    const { action, allowedSpinner, targetAngle, spinDuration, winnerName, playerId } = body;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    // Verify admin identity
    const adminUser = verifyAuthToken(req);
    const isAdmin = adminUser ? room.adminId === adminUser.id : false;

    // 1. SET SPINNER (Admin only)
    if (action === 'set-spinner') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Solo el administrador puede delegar el giro' }, { status: 403 });
      }

      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: { allowedSpinner: allowedSpinner || 'ADMIN' }
      });

      return NextResponse.json({ success: true, room: updatedRoom });
    }

    // 2. SPIN (Admin or Allowed Player)
    if (action === 'spin') {
      const isAllowedPlayer = room.allowedSpinner && room.allowedSpinner !== 'ADMIN' && room.allowedSpinner === playerId;
      
      if (!isAdmin && !isAllowedPlayer) {
        return NextResponse.json({ error: 'No tienes autorización para girar la ruleta' }, { status: 403 });
      }

      if (targetAngle === undefined || !winnerName) {
        return NextResponse.json({ error: 'Parámetros del giro inválidos' }, { status: 400 });
      }

      // Update room state to SPINNING
      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'SPINNING',
          isSpinning: true,
          targetAngle: parseFloat(targetAngle),
          spinDuration: parseInt(spinDuration) || 5000,
          winnerName: winnerName
        }
      });

      return NextResponse.json({ success: true, room: updatedRoom });
    }

    // 3. RESET (Admin only)
    if (action === 'reset') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Solo el administrador puede reiniciar la sala' }, { status: 403 });
      }

      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'OPEN',
          isSpinning: false,
          winnerName: null,
          targetAngle: null,
          allowedSpinner: 'ADMIN' // Reset spinner control to Admin
        }
      });

      return NextResponse.json({ success: true, room: updatedRoom });
    }

    // 4. SYNC FINISHED (Used by clients to notify that animation ended and save state)
    if (action === 'finish-spin') {
      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'FINISHED',
          isSpinning: false
        }
      });
      return NextResponse.json({ success: true, room: updatedRoom });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error en la petición de control' }, { status: 500 });
  }
}
