import { NextRequest, NextResponse } from 'next/server';
import { z, Infer } from '@/lib/validation';
import { upsertLessonProgress } from '@/lib/db/queries';
import { clamp } from '@/lib/utils';

const bodySchema = z.object({
  watchedSeconds: z.number().int().min(0).optional(),
  videoPercent: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  applied: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: Infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Defense in depth: clamp the percent before storing.
  if (typeof body.videoPercent === 'number') {
    body.videoPercent = clamp(body.videoPercent, 0, 100);
  }

  const result = await upsertLessonProgress(params.slug, body);
  return NextResponse.json({ ok: true, progress: result });
}
