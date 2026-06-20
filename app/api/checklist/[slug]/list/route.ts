import { NextRequest, NextResponse } from 'next/server';
import { getChecklistProgress } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const progress = await getChecklistProgress(params.slug);
  return NextResponse.json({ progress });
}
