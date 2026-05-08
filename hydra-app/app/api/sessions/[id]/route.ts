import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: { id: string } };

// GET /api/sessions/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await db.session.findUnique({
    where: { id: params.id },
    include: { responses: true, tags: true },
  });

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}

// PATCH /api/sessions/:id — update notes or synthesis
export async function PATCH(req: NextRequest, { params }: Params) {
  let body: {
    title?: string;
    notes?: string;
    synthesis?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const session = await db.session.update({
      where: { id: params.id },
      data: {
        ...(body.title     !== undefined ? { title: body.title }         : {}),
        ...(body.notes     !== undefined ? { notes: body.notes }         : {}),
        ...(body.synthesis !== undefined ? { synthesis: body.synthesis } : {}),
      },
    });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

// DELETE /api/sessions/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await db.session.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
