import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/sessions — list all sessions, newest first
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q    = searchParams.get('q') ?? '';
  const mode = searchParams.get('mode') ?? '';

  const sessions = await db.session.findMany({
    where: {
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { query: { contains: q } },
        ],
      } : {}),
      ...(mode ? { mode } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      query: true,
      mode: true,
      voices: true,
      createdAt: true,
    },
  });

  return NextResponse.json(sessions);
}

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    query: string;
    mode: string;
    voices?: number;
    responses?: { model: string; content: string; reasoning?: string }[];
    synthesis?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.query || !body.mode) {
    return NextResponse.json(
      { error: 'query and mode are required' },
      { status: 400 },
    );
  }

  const title = body.title ?? body.query.slice(0, 80);
  const responsesInput = body.responses ?? [];

  const session = await db.session.create({
    data: {
      title,
      query:     body.query,
      mode:      body.mode,
      voices:    body.voices ?? 6,
      synthesis: body.synthesis,
      notes:     body.notes,
      responses: responsesInput.length
        ? { create: responsesInput.map((r) => ({ model: r.model, content: r.content })) }
        : undefined,
    },
    include: { responses: true },
  });

  // Persiste o reasoning por SQL directo: a coluna existe na BD, mas o client
  // Prisma gerado pode não a conhecer ainda — raw evita essa dependência de tipos.
  await Promise.all(
    session.responses.map(async (resp) => {
      const match = responsesInput.find((r) => r.model === resp.model);
      if (match?.reasoning) {
        try {
          await db.$executeRaw`UPDATE "Response" SET "reasoning" = ${match.reasoning} WHERE "id" = ${resp.id}`;
        } catch { /* coluna ausente — ignora */ }
      }
    }),
  );

  return NextResponse.json(session, { status: 201 });
}
