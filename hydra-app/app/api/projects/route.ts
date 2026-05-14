import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { sessions: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  let body: { name: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const project = await db.project.create({
    data: { name: body.name.trim(), color: body.color ?? '#7A9A6A' },
  });
  return NextResponse.json(project, { status: 201 });
}
