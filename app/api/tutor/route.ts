import { NextRequest, NextResponse } from 'next/server';
import { course } from '@/lib/course';
import { runTutor, type TutorPromptId } from '@/lib/ai/tutor';
import { TUTOR_PROMPTS } from '@/lib/ai/tutor-prompts';

const PROMPT_IDS = new Set<string>(TUTOR_PROMPTS.map((p) => p.id));

export async function POST(request: NextRequest) {
  let body: { slug?: string; promptId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const promptId = typeof body.promptId === 'string' ? body.promptId : '';

  if (!slug || !PROMPT_IDS.has(promptId)) {
    return NextResponse.json({ error: 'slug and promptId required' }, { status: 400 });
  }

  const lesson = course.lessons.find((l) => l.slug === slug);
  if (!lesson) {
    return NextResponse.json({ error: `Lesson not found: ${slug}` }, { status: 404 });
  }

  try {
    const result = runTutor(lesson, promptId as TutorPromptId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
