import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: { id: string } };

// PATCH /api/templates/:id — renomeia e/ou actualiza o corpo.
export async function PATCH(req: NextRequest, { params }: Params) {
  let payload: { name?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (typeof payload.name === 'string' && payload.name.trim()) {
      await db.$executeRaw`UPDATE "PromptTemplate" SET "name" = ${payload.name.trim()} WHERE "id" = ${params.id}`;
    }
    if (typeof payload.body === 'string') {
      await db.$executeRaw`UPDATE "PromptTemplate" SET "body" = ${payload.body} WHERE "id" = ${params.id}`;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not update template' }, { status: 400 });
  }
}

// DELETE /api/templates/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await db.$executeRaw`DELETE FROM "PromptTemplate" WHERE "id" = ${params.id}`;
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Could not delete template' }, { status: 400 });
  }
}
