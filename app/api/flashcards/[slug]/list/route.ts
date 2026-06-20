import { NextRequest, NextResponse } from 'next/server';
import { getFlashcardProgress } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const progress = await getFlashcardProgress(params.slug);
  return NextResponse.json({ progress });
}
