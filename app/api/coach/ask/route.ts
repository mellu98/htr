import { NextRequest, NextResponse } from 'next/server';
import { course } from '@/lib/course';
import { readLessonAnalysis, readSummary } from '@/lib/content';
import {
  runCoach,
  COACH_PROMPTS,
  type CoachPromptId,
} from '@/lib/wave-up/coach';
import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listTasks } from '@/lib/db/wave-up-queries';

const PROMPT_IDS = new Set<string>(COACH_PROMPTS.map((p) => p.id));

export async function POST(request: NextRequest) {
  let body: { promptId?: string; lessonSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const promptId = typeof body.promptId === 'string' ? body.promptId : '';
  const lessonSlug = typeof body.lessonSlug === 'string' ? body.lessonSlug : '';

  if (!PROMPT_IDS.has(promptId)) {
    return NextResponse.json({ error: 'promptId required' }, { status: 400 });
  }

  const [artist] = await Promise.all([getActiveArtist()]);
  const lesson = lessonSlug
    ? course.lessons.find((l) => l.slug === lessonSlug) ?? null
    : null;

  const tasks = artist ? await listTasks(artist.id) : [];
  const openTasks = tasks.filter((t) => t.status !== 'done');

  const response = runCoach(promptId as CoachPromptId, {
    artist: artist
      ? ({
          ...artist,
          activePlatforms: artist.activePlatforms,
        } as any)
      : null,
    lesson,
    lessonSlug: lessonSlug || undefined,
    lessonAnalysis: lessonSlug ? readLessonAnalysis(lessonSlug) : null,
    lessonSummary: lessonSlug ? readSummary(lessonSlug) : null,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      expectedOutput: t.expectedOutput,
    })),
    activeTaskCount: openTasks.filter((t) => t.status === 'in_progress').length,
    blockedTaskCount: openTasks.filter((t) => t.status === 'blocked').length,
    nextCallAt: artist?.nextCallAt ?? null,
  });

  return NextResponse.json({ ok: true, response });
}
