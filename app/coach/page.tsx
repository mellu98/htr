import { course } from '@/lib/course';
import {
  getActiveArtist,
  getTaskStats,
  listCoachHistory,
  listTasks,
} from '@/lib/db/wave-up-queries';
import { CoachPanel } from '@/components/coach/CoachPanel';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const active = await getActiveArtist();
  const tasks = active ? await listTasks(active.id) : [];
  const stats = active
    ? await getTaskStats(active.id)
    : { todo: 0, inProgress: 0, done: 0, blocked: 0, overdue: 0, total: 0 };
  const history = active ? await listCoachHistory(active.id) : [];

  return (
    <CoachPanel
      activeArtist={
        active
          ? {
              id: active.id,
              artistName: active.artistName,
              musicGenre: active.musicGenre,
              mainGoal: active.mainGoal,
              biggestBlock: active.biggestBlock,
              nextCallAt: active.nextCallAt?.toISOString() ?? null,
            }
          : null
      }
      lessons={course.lessons}
      initialHistory={history.map((h) => ({
        id: h.id,
        promptLabel: h.promptLabel,
        coachResponse: h.coachResponse,
        sources: h.sources ? safeJsonArray(h.sources) : [],
        createdAt: h.createdAt.toISOString(),
      }))}
      initialContext={{
        artist: active
          ? {
              id: active.id,
              artistName: active.artistName,
              musicGenre: active.musicGenre,
              mainGoal: active.mainGoal,
              biggestBlock: active.biggestBlock,
              nextCallAt: active.nextCallAt?.toISOString() ?? null,
            }
          : null,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          expectedOutput: t.expectedOutput,
        })),
        activeTaskCount: stats.todo + stats.inProgress,
        blockedTaskCount: stats.blocked,
        nextCallAt: active?.nextCallAt?.toISOString() ?? null,
      }}
    />
  );
}

function safeJsonArray(input: string): string[] {
  try {
    const v = JSON.parse(input);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
