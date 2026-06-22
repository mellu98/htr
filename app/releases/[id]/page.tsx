import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getRelease } from '@/lib/db/release-queries';
import { ReleaseDetailPanel } from '@/components/releases/ReleaseDetailPanel';

export const dynamic = 'force-dynamic';

export default async function ReleaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const release = await getRelease(params.id);
  if (!release) return notFound();

  const normalized = {
    id: release.id,
    title: release.title,
    type: release.type,
    status: release.status,
    releaseDate: release.releaseDate?.toISOString() ?? null,
    mainGoal: release.mainGoal,
    notes: release.notes,
    budget: release.budget,
    platforms: release.platforms,
    artistProfileId: release.artistProfileId,
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
    milestones: release.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      priority: m.priority,
      dueDate: m.dueDate?.toISOString() ?? null,
    })),
    contentIdeas: release.contentIdeas.map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      format: c.format,
      status: c.status,
      hook: c.hook,
      publishAt: c.publishAt?.toISOString() ?? null,
    })),
    metrics: release.metrics.map((m) => ({
      id: m.id,
      platform: m.platform,
      date: m.date.toISOString(),
      followers: m.followers,
      streams: m.streams,
      views: m.views,
      linkClicks: m.linkClicks,
    })),
    goals: release.goals.map((g) => ({
      id: g.id,
      title: g.title,
      metric: g.metric,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      status: g.status,
      deadline: g.deadline?.toISOString() ?? null,
    })),
    outreach: release.outreach.map((o) => ({
      id: o.id,
      channel: o.channel,
      status: o.status,
      contactName: (o as any).contact?.name ?? 'Contatto',
      contactId: o.contactId,
      message: o.message,
      nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null,
    })),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/releases"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Torna alle release
      </Link>
      <ReleaseDetailPanel release={normalized as any} />
    </div>
  );
}