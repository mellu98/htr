import { NextRequest, NextResponse } from 'next/server';
import { z } from '@/lib/validation';
import { setReviewStatus } from '@/lib/db/queries';

type ReviewStatus = 'pending' | 'reviewed' | 'needs_edits' | 'approved';

const bodySchema = z.shape<{
  status: ReviewStatus;
  notes?: string;
  reviewerNotes?: string;
}>({
  status: z.enum(['pending', 'reviewed', 'needs_edits', 'approved']),
  notes: z.string().max(2000).optional(),
  reviewerNotes: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: { status: ReviewStatus; notes?: string; reviewerNotes?: string };
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const result = await setReviewStatus(
    params.slug,
    body.status,
    body.notes,
    body.reviewerNotes,
  );
  return NextResponse.json({ ok: true, review: result });
}
