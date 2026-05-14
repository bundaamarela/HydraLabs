import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const workspaces = await db.workspace.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { blocks: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  });
  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  let body: { title: string; description?: string; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  const workspace = await db.workspace.create({
    data: {
      title: body.title.trim(),
      description: body.description,
      projectId: body.projectId ?? null,
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(workspace, { status: 201 });
}
