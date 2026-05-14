import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const blocks = await db.block.findMany({
    where: { workspaceId: params.id },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest, { params }: Params) {
  let body: { type: string; content?: string; meta?: string; order: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.type) return NextResponse.json({ error: 'type required' }, { status: 400 });

  const block = await db.block.create({
    data: {
      workspaceId: params.id,
      type: body.type,
      content: body.content ?? null,
      meta: body.meta ?? null,
      order: body.order,
    },
  });

  // Touch workspace updatedAt
  await db.workspace.update({ where: { id: params.id }, data: {} });

  return NextResponse.json(block, { status: 201 });
}

// PATCH — reorder: body = { blocks: [{ id, order }] }
export async function PATCH(req: NextRequest, { params }: Params) {
  let body: { blocks: { id: string; order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.blocks)) {
    return NextResponse.json({ error: 'blocks array required' }, { status: 400 });
  }
  await Promise.all(
    body.blocks.map(({ id, order }) =>
      db.block.update({ where: { id }, data: { order } }),
    ),
  );
  await db.workspace.update({ where: { id: params.id }, data: {} });
  return NextResponse.json({ ok: true });
}
