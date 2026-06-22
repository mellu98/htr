import { NextRequest, NextResponse } from 'next/server';
import {
  updateMilestone,
  deleteMilestone,
  MILESTONE_STATUSES,
  MILESTONE_PRIORITIES,
} from '@/lib/db/release-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const patch: any = {};
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.description !== undefined) patch.description = body.description;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.status !== undefined) patch.status = asEnum(body.status, MILESTONE_STATUSES, 'todo');
  if (body.priority !== undefined) patch.priority = asEnum(body.priority, MILESTONE_PRIORITIES, 'medium');
  const milestone = await updateMilestone(params.id, patch);
  return NextResponse.json({ ok: true, milestone });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteMilestone(params.id);
  return NextResponse.json({ ok: true });
}