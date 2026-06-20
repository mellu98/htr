import { NextRequest, NextResponse } from 'next/server';
import {
  deleteTask,
  TaskPriority,
  TaskStatus,
  updateTask,
} from '@/lib/db/wave-up-queries';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const patch: any = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.expectedOutput === 'string') patch.expectedOutput = body.expectedOutput;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.priority !== undefined) patch.priority = asEnum(body.priority, PRIORITIES, 'medium');
  if (body.status !== undefined) patch.status = asEnum(body.status, STATUSES, 'todo');
  const updated = await updateTask(params.id, patch);
  return NextResponse.json({ ok: true, task: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await deleteTask(params.id);
  return NextResponse.json({ ok: true });
}
