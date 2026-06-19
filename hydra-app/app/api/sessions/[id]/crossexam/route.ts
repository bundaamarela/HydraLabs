import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

type Params = { params: { id: string } };

// POST /api/sessions/:id/crossexam — persiste um turno de cruzamento na sessão.
// SQL directo: a tabela existe na BD (db push), mas o client Prisma gerado pode
// não a conhecer ainda enquanto o dev server segura o motor — raw evita isso.
export async function POST(req: NextRequest, { params }: Params) {
  let body: {
    sourceModel: string;
    targetModel: string;
    action: string;
    content: string;
    reasoning?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.sourceModel || !body.targetModel || !body.action || !body.content) {
    return NextResponse.json(
      { error: 'sourceModel, targetModel, action and content are required' },
      { status: 400 },
    );
  }

  const id = randomUUID();
  try {
    await db.$executeRaw`
      INSERT INTO "CrossExam" ("id","sessionId","sourceModel","targetModel","action","content","reasoning","createdAt")
      VALUES (${id}, ${params.id}, ${body.sourceModel}, ${body.targetModel}, ${body.action}, ${body.content}, ${body.reasoning ?? null}, ${new Date().toISOString()})
    `;
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not save cross-exam' }, { status: 400 });
  }
}
