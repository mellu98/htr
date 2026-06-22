import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { listContentIdeas } from '@/lib/db/content-queries';
import { ContentPanel } from '@/components/content/ContentPanel';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const artist = await getActiveArtist();
  const ideas = artist
    ? await listContentIdeas({ artistProfileId: artist.id })
    : [];

  const normalized = ideas.map((c) => ({
    id: c.id,
    title: c.title,
    platform: c.platform,
    format: c.format,
    hook: c.hook,
    caption: c.caption,
    cta: c.cta,
    script: c.script,
    status: c.status,
    publishAt: c.publishAt?.toISOString() ?? null,
    publishedAt: c.publishedAt?.toISOString() ?? null,
    releaseId: c.releaseId,
    artistProfileId: c.artistProfileId,
  }));

  return (
    <ContentPanel
      activeArtist={artist ? { id: artist.id, artistName: artist.artistName } : null}
      ideas={normalized as any}
    />
  );
}