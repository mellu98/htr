import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { refreshManagerStats } from '@/lib/db/wave-up-queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const data: any = {};
  if (typeof body.nickname === 'string') data.nickname = body.nickname;
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.nextCallAt !== 'undefined') {
    data.nextCallAt = body.nextCallAt ? new Date(body.nextCallAt) : null;
  }
  if (typeof body.lastBlock === 'string') data.lastBlock = body.lastBlock;
  if (typeof body.nextAction === 'string') data.nextAction = body.nextAction;
  if (typeof body.courseProgressPercent === 'number') {
    data.courseProgressPercent = Math.max(0, Math.min(100, Math.round(body.courseProgressPercent)));
  }
  const updated = await prisma.managerArtist.update({
    where: { id: params.id },
    data,
  });
  await refreshManagerStats(params.id);
  return NextResponse.json({ ok: true, managerArtist: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await prisma.managerArtist.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
