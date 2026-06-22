import { NextRequest, NextResponse } from 'next/server';
import { listMetricSnapshots, createMetricSnapshot } from '@/lib/db/metrics-queries';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const snapshots = await listMetricSnapshots({
    artistProfileId: sp.get('artistProfileId') ?? undefined,
    releaseId: sp.get('releaseId') ?? undefined,
    platform: sp.get('platform') ?? undefined,
  });
  return NextResponse.json({ metricSnapshots: snapshots });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.platform || !body?.date) {
    return NextResponse.json(
      { error: 'artistProfileId, platform, date are required' },
      { status: 400 },
    );
  }
  const snapshot = await createMetricSnapshot({
    artistProfileId: String(body.artistProfileId),
    releaseId: body.releaseId ?? null,
    platform: String(body.platform),
    date: body.date,
    followers: body.followers,
    views: body.views,
    likes: body.likes,
    comments: body.comments,
    shares: body.shares,
    saves: body.saves,
    streams: body.streams,
    monthlyListeners: body.monthlyListeners,
    profileVisits: body.profileVisits,
    linkClicks: body.linkClicks,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ ok: true, metricSnapshot: snapshot });
}