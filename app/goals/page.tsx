import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listGoals } from '@/lib/db/goal-queries';
import { GoalsPanel } from '@/components/goals/GoalsPanel';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const artist = await getActiveArtist();
  const goals = artist ? await listGoals({ artistProfileId: artist.id }) : [];

  const normalized = goals.map((g) => ({
    id: g.id,
    title: g.title,
    metric: g.metric,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    deadline: g.deadline?.toISOString() ?? null,
    status: g.status,
    releaseId: g.releaseId,
    artistProfileId: g.artistProfileId,
  }));

  return (
    <GoalsPanel
      activeArtist={artist ? { id: artist.id, artistName: artist.artistName } : null}
      goals={normalized as any}
    />
  );
}