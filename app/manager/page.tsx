import { listArtists, listManagerArtists } from '@/lib/db/wave-up-queries';
import { ManagerRoster } from '@/components/manager/ManagerRoster';

export const dynamic = 'force-dynamic';

export default async function ManagerPage() {
  const [cards, allArtists] = await Promise.all([
    listManagerArtists(),
    listArtists(),
  ]);

  const linkedIds = new Set(cards.map((c) => c.artistProfileId));
  const available = allArtists
    .filter((a) => !linkedIds.has(a.id))
    .map((a) => ({
      id: a.id,
      artistName: a.artistName,
      musicGenre: a.musicGenre,
      currentLevel: a.currentLevel,
    }));

  const normalizedCards = cards.map((c) => ({
    ...c,
    nextCallAt: c.nextCallAt?.toISOString() ?? null,
    artistProfile: {
      id: c.artistProfile.id,
      artistName: c.artistProfile.artistName,
      musicGenre: c.artistProfile.musicGenre,
      currentLevel: c.artistProfile.currentLevel,
      biggestBlock: c.artistProfile.biggestBlock,
    },
  }));

  return (
    <ManagerRoster
      initialCards={normalizedCards as any}
      availableArtists={available}
    />
  );
}
