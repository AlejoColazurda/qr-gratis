import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET: Fetch all QR codes for the logged-in user
export async function GET(req: NextRequest) {
  const user = verifyAuthToken(req);

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const qrs = await prisma.qRCode.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ qrs });
  } catch (error) {
    console.error('Error fetching QRs:', error);
    return NextResponse.json({ error: 'Error al obtener los QRs' }, { status: 500 });
  }
}

// POST: Create and save a new QR code configuration
export async function POST(req: NextRequest) {
  const user = verifyAuthToken(req);

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { name, url, styles } = await req.json();

    if (!name || !url) {
      return NextResponse.json(
        { error: 'El nombre y la URL son requeridos' },
        { status: 400 }
      );
    }

    const qrCode = await prisma.qRCode.create({
      data: {
        name,
        url,
        styles: styles || {},
        userId: user.id,
      },
    });

    return NextResponse.json({ qrCode }, { status: 201 });
  } catch (error) {
    console.error('Error creating QR:', error);
    return NextResponse.json({ error: 'Error al guardar el QR' }, { status: 500 });
  }
}

// DELETE: Remove a QR code by ID (only if it belongs to the logged-in user)
export async function DELETE(req: NextRequest) {
  const user = verifyAuthToken(req);

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Check ownership before deleting
    const existingQR = await prisma.qRCode.findUnique({
      where: { id },
    });

    if (!existingQR) {
      return NextResponse.json({ error: 'Código QR no encontrado' }, { status: 404 });
    }

    if (existingQR.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.qRCode.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Código QR eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting QR:', error);
    return NextResponse.json({ error: 'Error al eliminar el QR' }, { status: 500 });
  }
}
