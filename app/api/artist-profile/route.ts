import { NextRequest, NextResponse } from 'next/server';
import {
  createArtist,
  getActiveArtist,
  listArtists,
  setActiveArtist,
} from '@/lib/db/wave-up-queries';

const PLATFORMS = [
  'instagram',
  'tiktok',
  'spotify',
  'youtube',
  'apple-music',
  'soundcloud',
  'twitter',
  'website',
  'bandcamp',
] as const;
const LEVELS = ['emerging', 'growing', 'established'] as const;
const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function asArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.filter((s) => typeof s === 'string');
  if (typeof input === 'string' && input.trim()) {
    return input
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function asEnum<T extends readonly string[]>(input: unknown, allowed: T): T[number] | null {
  if (typeof input !== 'string') return null;
  return (allowed as readonly string[]).includes(input) ? (input as T[number]) : null;
}

function normalize(input: any) {
  return {
    artistName: String(input?.artistName ?? '').trim(),
    musicGenre: typeof input?.musicGenre === 'string' ? input.musicGenre : undefined,
    currentLevel: asEnum(input?.currentLevel, LEVELS) ?? undefined,
    mainGoal: typeof input?.mainGoal === 'string' ? input.mainGoal : undefined,
    targetAudience: typeof input?.targetAudience === 'string' ? input.targetAudience : undefined,
    nextReleaseDate: input?.nextReleaseDate ?? null,
    activePlatforms: asArray(input?.activePlatforms).filter((p) =>
      (PLATFORMS as readonly string[]).includes(p),
    ),
    biggestBlock: typeof input?.biggestBlock === 'string' ? input.biggestBlock : undefined,
    brandKeywords: typeof input?.brandKeywords === 'string' ? input.brandKeywords : undefined,
    referenceArtists: typeof input?.referenceArtists === 'string' ? input.referenceArtists : undefined,
    notes: typeof input?.notes === 'string' ? input.notes : undefined,
    weeklyCallDay: asEnum(input?.weeklyCallDay, DAYS) ?? undefined,
    nextCallAt: input?.nextCallAt ?? null,
  };
}

export async function GET() {
  const [active, all] = await Promise.all([
    getActiveArtist(),
    listArtists(),
  ]);
  return NextResponse.json({ active, artists: all });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const input = normalize(body);
  if (!input.artistName) {
    return NextResponse.json({ error: 'artistName is required' }, { status: 400 });
  }
  const created = await createArtist(input as any);
  return NextResponse.json({ ok: true, artist: created });
}

export async function PATCH(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (body.id && body.setActive === true) {
    await setActiveArtist(body.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unsupported PATCH' }, { status: 400 });
}
