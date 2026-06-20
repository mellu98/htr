import {
  getActiveArtist,
  listCallPrepReports,
} from '@/lib/db/wave-up-queries';
import { CallPrepPanel } from '@/components/call-prep/CallPrepPanel';

export const dynamic = 'force-dynamic';

export default async function CallPrepPage() {
  const artist = await getActiveArtist();
  const reports = artist ? await listCallPrepReports(artist.id) : [];

  const normalized = reports.map((r) => ({
    id: r.id,
    callDate: r.callDate?.toISOString() ?? null,
    completedSince: r.completedSince ?? '',
    openTasks: r.openTasks ?? '',
    blocks: r.blocks ?? '',
    questions: r.questions ?? '',
    decisions: r.decisions ?? '',
    nextWeekPlan: r.nextWeekPlan ?? '',
    fullMarkdown: r.fullMarkdown ?? '',
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <CallPrepPanel
      activeArtist={
        artist
          ? {
              id: artist.id,
              artistName: artist.artistName,
              nextCallAt: artist.nextCallAt?.toISOString() ?? null,
            }
          : null
      }
      initialReports={normalized}
    />
  );
}
