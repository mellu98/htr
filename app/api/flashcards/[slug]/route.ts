import { NextRequest, NextResponse } from 'next/server';
import { z } from '@/lib/validation';
import { setFlashcardStatus } from '@/lib/db/queries';

const bodySchema = z.shape<{ cardId: string; status: 'known' | 'review' | 'unknown' }>({
  cardId: z.string().min(1).max(200),
  status: z.enum(['known', 'review', 'unknown']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: { cardId: string; status: 'known' | 'review' | 'unknown' };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const result = await setFlashcardStatus(params.slug, body.cardId, body.status);
  return NextResponse.json({ ok: true, progress: result });
}
