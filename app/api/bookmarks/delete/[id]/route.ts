import { NextRequest, NextResponse } from 'next/server';
import { deleteBookmark } from '@/lib/db/queries';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await deleteBookmark(params.id);
  return NextResponse.json({ ok: true });
}
