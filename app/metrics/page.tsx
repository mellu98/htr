import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listMetricSnapshots, getLatestComparison } from '@/lib/db/metrics-queries';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';

export const dynamic = 'force-dynamic';

export default async function MetricsPage() {
  const artist = await getActiveArtist();
  const snapshots = artist
    ? await listMetricSnapshots({ artistProfileId: artist.id })
    : [];
  const comparisons = artist ? await getLatestComparison(artist.id) : {};

  const normalized = snapshots.map((s) => ({
    id: s.id,
    platform: s.platform,
    date: s.date.toISOString(),
    followers: s.followers,
    views: s.views,
    likes: s.likes,
    streams: s.streams,
    linkClicks: s.linkClicks,
    monthlyListeners: s.monthlyListeners,
    notes: s.notes,
    artistProfileId: s.artistProfileId,
  }));

  const compsNormalized: Record<string, { latest: any; previous: any }> = {};
  for (const [plat, list] of Object.entries(comparisons)) {
    if (!list[0]) continue;
    compsNormalized[plat] = {
      latest: {
        date: list[0].date.toISOString(),
        followers: list[0].followers,
        streams: list[0].streams,
        views: list[0].views,
        linkClicks: list[0].linkClicks,
      },
      previous: list[1]
        ? {
            date: list[1].date.toISOString(),
            followers: list[1].followers,
            streams: list[1].streams,
            views: list[1].views,
            linkClicks: list[1].linkClicks,
          }
        : null,
    };
  }

  return (
    <MetricsPanel
      activeArtist={artist ? { id: artist.id, artistName: artist.artistName } : null}
      snapshots={normalized as any}
      comparisons={compsNormalized as any}
    />
  );
}