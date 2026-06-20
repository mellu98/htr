import { getActiveArtist, listArtists, listTasks } from '@/lib/db/wave-up-queries';
import { TasksKanban } from '@/components/tasks/TasksKanban';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const [active, all] = await Promise.all([getActiveArtist(), listArtists()]);
  const tasks = active ? await listTasks(active.id) : [];

  const normalized = tasks.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <TasksKanban
      initialTasks={normalized as any}
      activeArtist={active ? { id: active.id, artistName: active.artistName } : null}
      allArtists={all.map((a) => ({ id: a.id, artistName: a.artistName }))}
    />
  );
}
