import Link from 'next/link';
import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listReleases } from '@/lib/db/release-queries';
import { ReleasesPanel } from '@/components/releases/ReleasesPanel';

export const dynamic = 'force-dynamic';

export default async function ReleasesPage() {
  const artist = await getActiveArtist();
  const releases = artist
    ? await listReleases(artist.id)
    : [];

  const normalized = releases.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    releaseDate: r.releaseDate?.toISOString() ?? null,
    mainGoal: r.mainGoal,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    openMilestones:
      r.milestones?.filter((m) => m.status !== 'done').length ?? 0,
    totalMilestones: r.milestones?.length ?? 0,
    scheduledContent:
      r.contentIdeas?.filter((c) => c.status === 'scheduled' || c.status === 'approved')
        .length ?? 0,
    activeGoals: r.goals?.filter((g) => g.status === 'active').length ?? 0,
    nextMilestone:
      r.milestones
        ?.filter((m) => m.status !== 'done')
        ?.sort((a, b) => {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return da - db;
        })[0] ?? null,
  }));

  return (
    <ReleasesPanel
      activeArtist={artist ? { id: artist.id, artistName: artist.artistName } : null}
      releases={normalized as any}
    />
  );
}