import { NextRequest, NextResponse } from 'next/server';
import { z, Infer } from '@/lib/validation';
import { recordQuizAttempt } from '@/lib/db/queries';
import { readQuiz } from '@/lib/content';
import { getLesson } from '@/lib/course';

const bodySchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: Infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const lesson = getLesson(params.slug);
  if (!lesson) {
    return NextResponse.json({ error: 'Unknown lesson' }, { status: 404 });
  }

  const quiz = readQuiz(params.slug);
  if (!quiz) {
    return NextResponse.json({ error: 'No quiz generated for this lesson yet' }, { status: 404 });
  }

  let correct = 0;
  for (const q of quiz) {
    if ((body.answers[q.id] ?? '').trim() === q.correctAnswer.trim()) correct++;
  }
  const score = Math.round((correct / quiz.length) * 100);
  const attempt = await recordQuizAttempt(params.slug, {
    score,
    totalQuestions: quiz.length,
    correctAnswers: correct,
    answers: body.answers,
  });

  return NextResponse.json({
    ok: true,
    score,
    correctAnswers: correct,
    totalQuestions: quiz.length,
    attempt,
  });
}
