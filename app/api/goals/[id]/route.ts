import { NextRequest, NextResponse } from 'next/server';
import {
  updateGoal,
  deleteGoal,
  GOAL_STATUSES,
} from '@/lib/db/goal-queries';

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
  if (body.releaseId !== undefined) patch.releaseId = body.releaseId;
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.metric !== undefined) patch.metric = String(body.metric);
  if (body.targetValue !== undefined) patch.targetValue = body.targetValue;
  if (body.currentValue !== undefined) patch.currentValue = body.currentValue;
  if (body.deadline !== undefined) patch.deadline = body.deadline;
  if (body.status !== undefined) patch.status = asEnum(body.status, GOAL_STATUSES, 'active');
  const goal = await updateGoal(params.id, patch);
  return NextResponse.json({ ok: true, goal });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteGoal(params.id);
  return NextResponse.json({ ok: true });
}