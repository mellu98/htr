import { NextRequest, NextResponse } from 'next/server';
import { z, Infer } from '@/lib/validation';
import { createBookmark, listBookmarks } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const bookmarks = await listBookmarks(params.slug);
  return NextResponse.json({ bookmarks });
}

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
  videoTime: z.number().int().min(0).optional(),
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
  const bookmark = await createBookmark(params.slug, body);
  return NextResponse.json({ ok: true, bookmark });
}
