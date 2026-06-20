import { NextRequest, NextResponse } from 'next/server';
import { z, Infer } from '@/lib/validation';
import { getNote, upsertNote } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const note = await getNote(params.slug);
  return NextResponse.json({ note });
}

const bodySchema = z.object({ body: z.string() });

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  let body: Infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const note = await upsertNote(params.slug, body.body);
  return NextResponse.json({ ok: true, note });
}
