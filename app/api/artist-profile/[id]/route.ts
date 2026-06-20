import { NextRequest, NextResponse } from 'next/server';
import { deleteArtist, updateArtist } from '@/lib/db/wave-up-queries';

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

function asEnum<T extends readonly string[]>(input: unknown, allowed: T): T[number] | undefined {
  if (typeof input !== 'string') return undefined;
  return (allowed as readonly string[]).includes(input) ? (input as T[number]) : undefined;
}

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

function normalize(input: any) {
  return {
    artistName:
      typeof input?.artistName === 'string' && input.artistName.trim()
        ? input.artistName.trim()
        : undefined,
    musicGenre: typeof input?.musicGenre === 'string' ? input.musicGenre : undefined,
    currentLevel: asEnum(input?.currentLevel, LEVELS),
    mainGoal: typeof input?.mainGoal === 'string' ? input.mainGoal : undefined,
    targetAudience: typeof input?.targetAudience === 'string' ? input.targetAudience : undefined,
    nextReleaseDate: input?.nextReleaseDate ?? undefined,
    activePlatforms: input?.activePlatforms
      ? asArray(input.activePlatforms).filter((p) =>
          (PLATFORMS as readonly string[]).includes(p),
        )
      : undefined,
    biggestBlock: typeof input?.biggestBlock === 'string' ? input.biggestBlock : undefined,
    brandKeywords: typeof input?.brandKeywords === 'string' ? input.brandKeywords : undefined,
    referenceArtists: typeof input?.referenceArtists === 'string' ? input.referenceArtists : undefined,
    notes: typeof input?.notes === 'string' ? input.notes : undefined,
    weeklyCallDay: asEnum(input?.weeklyCallDay, DAYS),
    nextCallAt: input?.nextCallAt ?? undefined,
  };
}

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
  const input = normalize(body);
  const updated = await updateArtist(params.id, input as any);
  return NextResponse.json({ ok: true, artist: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await deleteArtist(params.id);
  return NextResponse.json({ ok: true });
}
