import { NextRequest, NextResponse } from 'next/server';
import {
  listReleases,
  createRelease,
  RELEASE_TYPES,
  RELEASE_STATUSES,
} from '@/lib/db/release-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const artistProfileId = request.nextUrl.searchParams.get('artistProfileId') ?? undefined;
  const releases = await listReleases(artistProfileId);
  return NextResponse.json({ releases });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.title) {
    return NextResponse.json(
      { error: 'artistProfileId and title are required' },
      { status: 400 },
    );
  }
  const release = await createRelease({
    artistProfileId: String(body.artistProfileId),
    title: String(body.title),
    type: asEnum(body.type, RELEASE_TYPES, 'single'),
    status: asEnum(body.status, RELEASE_STATUSES, 'planning'),
    releaseDate: body.releaseDate ?? null,
    mainGoal: body.mainGoal ?? null,
    budget: body.budget ?? null,
    platforms: body.platforms ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ ok: true, release });
}