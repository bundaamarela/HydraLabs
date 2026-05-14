import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const workspace = await db.workspace.findUnique({
    where: { id: params.id },
    include: {
      blocks: { orderBy: { order: 'asc' } },
      project: { select: { id: true, name: true, color: true } },
    },
  });
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  try {
    const workspace = await db.workspace.update({
      where: { id: params.id },
      data: {
        ...(body.title       !== undefined ? { title: body.title }             : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await db.workspace.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
