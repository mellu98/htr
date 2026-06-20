import { NextRequest, NextResponse } from 'next/server';
import {
  createTask,
  listAllTasks,
  listTasks,
  TaskPriority,
  TaskStatus,
} from '@/lib/db/wave-up-queries';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const artistProfileId = url.searchParams.get('artistProfileId');
  const tasks = artistProfileId ? await listTasks(artistProfileId) : await listAllTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.title) {
    return NextResponse.json(
      { error: 'artistProfileId and title are required' },
      { status: 400 },
    );
  }
  const task = await createTask({
    artistProfileId: body.artistProfileId,
    managerArtistId: body.managerArtistId || null,
    courseId: body.courseId || 'htr-training',
    lessonSlug: body.lessonSlug || null,
    title: String(body.title),
    description: body.description,
    priority: asEnum(body.priority, PRIORITIES, 'medium'),
    status: asEnum(body.status, STATUSES, 'todo'),
    dueDate: body.dueDate || null,
    expectedOutput: body.expectedOutput,
    coachPromptId: body.coachPromptId,
  });
  return NextResponse.json({ ok: true, task });
}
