import { listArtists, getActiveArtist } from '@/lib/db/wave-up-queries';
import { ArtistProfilePanel } from '@/components/artist/ArtistProfilePanel';

export const dynamic = 'force-dynamic';

export default async function ArtistProfilePage() {
  const [artists, active] = await Promise.all([listArtists(), getActiveArtist()]);
  const normalizedArtists = artists.map((a) => ({
    id: a.id,
    artistName: a.artistName,
    musicGenre: a.musicGenre,
    currentLevel: a.currentLevel,
    mainGoal: a.mainGoal,
    targetAudience: a.targetAudience,
    nextReleaseDate: a.nextReleaseDate?.toISOString() ?? null,
    activePlatforms: a.activePlatforms ? safeParseArray(a.activePlatforms) : null,
    biggestBlock: a.biggestBlock,
    brandKeywords: a.brandKeywords,
    referenceArtists: a.referenceArtists,
    notes: a.notes,
    weeklyCallDay: a.weeklyCallDay,
    nextCallAt: a.nextCallAt?.toISOString() ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));
  return (
    <ArtistProfilePanel
      initialArtists={normalizedArtists}
      initialActiveId={active?.id ?? null}
    />
  );
}

function safeParseArray(input: string): string[] {
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* ignore */
  }
  return [];
}
