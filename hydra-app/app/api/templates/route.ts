import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

interface TemplateRow { id: string; name: string; body: string; createdAt: string; }

// SQL directo: a tabela existe na BD (db push), mas o client Prisma gerado pode
// não a conhecer enquanto o dev server segura o motor — raw evita essa dependência.

// GET /api/templates — lista, mais recentes primeiro.
export async function GET() {
  try {
    const rows = await db.$queryRaw<TemplateRow[]>`
      SELECT "id", "name", "body", "createdAt" FROM "PromptTemplate" ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

// POST /api/templates — cria { name, body }.
export async function POST(req: NextRequest) {
  let payload: { name?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (payload.name ?? '').trim();
  const body = (payload.body ?? '').trim();
  if (!name || !body) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 });
  }

  const id = randomUUID();
  try {
    await db.$executeRaw`
      INSERT INTO "PromptTemplate" ("id", "name", "body", "createdAt")
      VALUES (${id}, ${name}, ${body}, ${new Date().toISOString()})
    `;
    return NextResponse.json({ id, name, body }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not save template' }, { status: 400 });
  }
}
