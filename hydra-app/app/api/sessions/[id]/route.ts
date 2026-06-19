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

  // Cruzamentos por SQL directo (o client gerado pode não conhecer o modelo
  // enquanto o dev server segura o motor Prisma). Falha → lista vazia.
  type CrossExamRow = {
    sourceModel: string; targetModel: string; action: string; content: string; reasoning: string | null;
  };
  let crossExams: CrossExamRow[] = [];
  try {
    crossExams = await db.$queryRaw<CrossExamRow[]>`
      SELECT "sourceModel", "targetModel", "action", "content", "reasoning"
      FROM "CrossExam" WHERE "sessionId" = ${params.id}
      ORDER BY "createdAt" ASC
    `;
  } catch { /* tabela ausente / motor — devolve vazio */ }

  return NextResponse.json({ ...session, crossExams });
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
