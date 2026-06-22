import {
  getActiveArtist,
  getTaskStats,
  listTasks,
} from '@/lib/db/wave-up-queries';
import { getAllLessonProgress } from '@/lib/db/queries';
import { course } from '@/lib/course';
import { listReleases } from '@/lib/db/release-queries';
import { listContentIdeas } from '@/lib/db/content-queries';
import { listOutreach } from '@/lib/db/crm-queries';
import { listGoals } from '@/lib/db/goal-queries';
import WaveUpDashboard from '@/components/dashboard/WaveUpDashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const artist = await getActiveArtist();
  if (!artist) {
    return (
      <WaveUpDashboard
        tasks={[]}
        taskStats={emptyStats()}
        recentLessons={[]}
        activeRelease={null}
        todaysContent={[]}
        openLoops={{ overdueMilestones: 0, blockedTasks: 0, overdueOutreach: 0, staleGoals: 0 }}
        activeGoals={[]}
      />
    );
  }
  const [tasks, stats, progress, releases, ideas, outreach, goals] = await Promise.all([
    listTasks(artist.id),
    getTaskStats(artist.id),
    getAllLessonProgress(),
    listReleases(artist.id),
    listContentIdeas({ artistProfileId: artist.id }),
    listOutreach({ artistProfileId: artist.id }),
    listGoals({ artistProfileId: artist.id }),
  ]);

  const recent = [...progress]
    .filter((p) => p.videoPercent > 0)
    .sort((a, b) => b.videoPercent - a.videoPercent)
    .slice(0, 5)
    .map((p) => {
      const lesson = course.lessons.find((l) => l.slug === p.lessonSlug);
      return {
        slug: p.lessonSlug,
        title: lesson?.title ?? p.lessonSlug,
        moduleTitle: lesson?.moduleTitle ?? '—',
        percent: p.videoPercent,
      };
    });

  // Active release = the nearest non-archived, non-released one
  const activeRelease =
    releases.find((r) => r.status === 'pre_release' || r.status === 'planning') ??
    releases.find((r) => r.status !== 'archived' && r.status !== 'released') ??
    null;

  // Today's content (publishAt within next 48h or status=scheduled)
  const now = Date.now();
  const todaysContent = ideas
    .filter((c) => {
      if (c.status === 'published' || c.status === 'archived') return false;
      if (!c.publishAt) return c.status === 'scheduled';
      const d = new Date(c.publishAt).getTime();
      return d >= now - 86400000 && d <= now + 86400000 * 2;
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      format: c.format,
      status: c.status,
      publishAt: c.publishAt?.toISOString() ?? null,
    }));

  // Open loops
  const overdueMilestones = activeRelease
    ? activeRelease.milestones.filter(
        (m) => m.status !== 'done' && m.dueDate && new Date(m.dueDate) < new Date(),
      ).length
    : 0;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const overdueOutreach = outreach.filter((o) => {
    if (o.status === 'closed' || o.status === 'rejected') return false;
    if (!o.nextFollowUpAt) return false;
    return new Date(o.nextFollowUpAt) < new Date();
  }).length;
  const staleGoals = goals.filter(
    (g) => g.status === 'active' && g.deadline && new Date(g.deadline) < new Date(),
  ).length;

  const activeGoals = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({
      id: g.id,
      title: g.title,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      metric: g.metric,
      deadline: g.deadline?.toISOString() ?? null,
    }));

  return (
    <WaveUpDashboard
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        expectedOutput: t.expectedOutput,
      }))}
      taskStats={stats}
      recentLessons={recent}
      activeRelease={
        activeRelease
          ? {
              id: activeRelease.id,
              title: activeRelease.title,
              type: activeRelease.type,
              status: activeRelease.status,
              releaseDate: activeRelease.releaseDate?.toISOString() ?? null,
              mainGoal: activeRelease.mainGoal,
              openMilestones: activeRelease.milestones.filter((m) => m.status !== 'done').length,
              totalMilestones: activeRelease.milestones.length,
              nextMilestone: activeRelease.milestones
                .filter((m) => m.status !== 'done')
                .sort((a, b) => {
                  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                  const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                  return da - db;
                })[0]
                ? {
                    id: activeRelease.milestones
                      .filter((m) => m.status !== 'done')
                      .sort((a, b) => {
                        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        return da - db;
                      })[0].id,
                    title: activeRelease.milestones
                      .filter((m) => m.status !== 'done')
                      .sort((a, b) => {
                        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        return da - db;
                      })[0].title,
                    dueDate: activeRelease.milestones
                      .filter((m) => m.status !== 'done')
                      .sort((a, b) => {
                        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        return da - db;
                      })[0].dueDate?.toISOString() ?? null,
                  }
                : null,
            }
          : null
      }
      todaysContent={todaysContent}
      openLoops={{ overdueMilestones, blockedTasks, overdueOutreach, staleGoals }}
      activeGoals={activeGoals}
    />
  );
}

function emptyStats() {
  return {
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    blocked: 0,
    overdue: 0,
  };
}