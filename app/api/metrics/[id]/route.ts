import { NextRequest, NextResponse } from 'next/server';
import { deleteMetricSnapshot } from '@/lib/db/metrics-queries';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteMetricSnapshot(params.id);
  return NextResponse.json({ ok: true });
}