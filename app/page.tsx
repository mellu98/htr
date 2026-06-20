import {
  getActiveArtist,
  getTaskStats,
  listTasks,
} from '@/lib/db/wave-up-queries';
import { getAllLessonProgress } from '@/lib/db/queries';
import { course } from '@/lib/course';
import WaveUpDashboard from '@/components/dashboard/WaveUpDashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const artist = await getActiveArtist();
  if (!artist) {
    return <WaveUpDashboard tasks={[]} taskStats={emptyStats()} recentLessons={[]} />;
  }
  const [tasks, stats, progress] = await Promise.all([
    listTasks(artist.id),
    getTaskStats(artist.id),
    getAllLessonProgress(),
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
