import { NextRequest, NextResponse } from 'next/server';
import { z, Infer } from '@/lib/validation';
import { setChecklistItem } from '@/lib/db/queries';

const bodySchema = z.object({
  itemId: z.string().min(1).max(200),
  completed: z.boolean(),
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
  const result = await setChecklistItem(params.slug, body.itemId, body.completed);
  return NextResponse.json({ ok: true, progress: result });
}
