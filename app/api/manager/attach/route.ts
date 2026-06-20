import { NextRequest, NextResponse } from 'next/server';
import {
  attachArtistToManager,
  refreshManagerStats,
  setActiveArtist,
} from '@/lib/db/wave-up-queries';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId) {
    return NextResponse.json({ error: 'artistProfileId required' }, { status: 400 });
  }
  const created = await attachArtistToManager(body.artistProfileId, body.nickname);
  if (body.setActive) {
    await setActiveArtist(body.artistProfileId);
  }
  await refreshManagerStats(created.id);
  return NextResponse.json({ ok: true, managerArtist: created });
}
