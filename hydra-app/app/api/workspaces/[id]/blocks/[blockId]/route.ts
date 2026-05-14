import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: { id: string; blockId: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  let body: { content?: string; meta?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  try {
    const block = await db.block.update({
      where: { id: params.blockId },
      data: {
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.meta    !== undefined ? { meta:    body.meta    } : {}),
      },
    });
    await db.workspace.update({ where: { id: params.id }, data: {} });
    return NextResponse.json(block);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await db.block.delete({ where: { id: params.blockId } });
    await db.workspace.update({ where: { id: params.id }, data: {} });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
