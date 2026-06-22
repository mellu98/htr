import { NextRequest, NextResponse } from 'next/server';
import {
  listMilestones,
  createMilestone,
  MILESTONE_STATUSES,
  MILESTONE_PRIORITIES,
} from '@/lib/db/release-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const releaseId = request.nextUrl.searchParams.get('releaseId') ?? undefined;
  const milestones = await listMilestones(releaseId);
  return NextResponse.json({ milestones });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.releaseId || !body?.title) {
    return NextResponse.json(
      { error: 'releaseId and title are required' },
      { status: 400 },
    );
  }
  const milestone = await createMilestone({
    releaseId: String(body.releaseId),
    title: String(body.title),
    description: body.description ?? null,
    dueDate: body.dueDate ?? null,
    status: asEnum(body.status, MILESTONE_STATUSES, 'todo'),
    priority: asEnum(body.priority, MILESTONE_PRIORITIES, 'medium'),
  });
  return NextResponse.json({ ok: true, milestone });
}