'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  CircleDashed,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Status = 'todo' | 'in_progress' | 'done' | 'blocked';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  artistProfileId: string;
  managerArtistId: string | null;
  courseId: string;
  lessonSlug: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  expectedOutput: string | null;
  coachPromptId: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ActiveArtist {
  id: string;
  artistName: string;
}

interface TasksKanbanProps {
  initialTasks: Task[];
  activeArtist: ActiveArtist | null;
  allArtists: ActiveArtist[];
  suggestedSeeds?: Array<{
    title: string;
    description: string;
    priority: Priority;
    expectedOutput: string;
    coachPromptId?: string;
  }>;
}

const COLUMNS: { id: Status; label: string; hint: string; tone: string; icon: any }[] = [
  { id: 'todo', label: 'Da fare', hint: 'Pianificato ma non iniziato', tone: 'border-border/60', icon: CircleDashed },
  { id: 'in_progress', label: 'In corso', hint: 'Lavoro attivo', tone: 'border-cyan-400/40', icon: Loader2 },
  { id: 'blocked', label: 'Bloccato', hint: 'Serve una decisione', tone: 'border-amber-400/40', icon: AlertCircle },
  { id: 'done', label: 'Completato', hint: 'Archiviato', tone: 'border-emerald-400/40', icon: CheckCircle2 },
];

const PRIORITY_TONE: Record<Priority, { label: string; tone: string }> = {
  low: { label: 'low', tone: 'bg-muted/60 text-muted-foreground' },
  medium: { label: 'medium', tone: 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30' },
  high: { label: 'high', tone: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/30' },
  urgent: { label: 'urgent', tone: 'bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-400/30' },
};

export function TasksKanban({
  initialTasks,
  activeArtist,
  allArtists,
  suggestedSeeds = [],
}: TasksKanbanProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [composerOpen, setComposerOpen] = useState(false);
  // Mobile-only: which single column is visible at a time on phones.
  // Desktop ignores this and shows all four columns in a grid.
  const [mobileColumn, setMobileColumn] = useState<Status>('todo');
  const [, startTransition] = useTransition();

  const tasksByStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      blocked: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function refresh() {
    if (!activeArtist) return;
    const res = await fetch(`/api/tasks?artistProfileId=${activeArtist.id}`);
    const json = await res.json();
    setTasks(json.tasks ?? []);
  }

  async function moveTask(id: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    });
  }

  async function deleteTask(id: string) {
    if (!confirm('Eliminare questo task?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    });
  }

  function handleSeedAll() {
    if (!activeArtist) return;
    startTransition(async () => {
      for (const seed of suggestedSeeds) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            artistProfileId: activeArtist.id,
            title: seed.title,
            description: seed.description,
            priority: seed.priority,
            expectedOutput: seed.expectedOutput,
            coachPromptId: seed.coachPromptId,
          }),
        });
      }
      await refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Tasks</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeArtist ? (
              <>
                Kanban per <span className="font-medium text-foreground">{activeArtist.artistName}</span> ·{' '}
                {tasks.length} task totali
              </>
            ) : (
              'Crea prima un profilo artista per iniziare.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {suggestedSeeds.length > 0 && activeArtist && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedAll}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              Aggiungi {suggestedSeeds.length} task suggeriti
            </Button>
          )}
          <Button
            size="sm"
            variant="gradient"
            onClick={() => setComposerOpen(true)}
            disabled={!activeArtist}
          >
            <Plus className="h-4 w-4" />
            Nuovo task
          </Button>
        </div>
      </header>

      {!activeArtist ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="font-medium">Nessun artista attivo.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Apri Artist Profile e salva un artista: diventa automaticamente
              quello attivo per il Coach e i Task.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/artist-profile">Vai a Artist Profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/*
            Mobile: tabbed single-column view. Each tab shows one bucket so
            the user doesn't have to scroll 4 columns vertically. Desktop
            shows the full grid below.
          */}
          <div className="md:hidden">
            <Tabs value={mobileColumn} onValueChange={(v) => setMobileColumn(v as Status)}>
              <TabsList className="flex w-full">
                {COLUMNS.map((col) => (
                  <TabsTrigger key={col.id} value={col.id} className="flex-1 gap-1">
                    <col.icon className="h-3.5 w-3.5" />
                    <span className="text-[11px]">{col.label.split(' ')[0]}</span>
                    <Badge variant="muted" className="ml-1 font-mono text-[9px]">
                      {tasksByStatus[col.id].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-4">
              {COLUMNS.filter((c) => c.id === mobileColumn).map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  items={tasksByStatus[col.id]}
                  onMove={moveTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </div>

          {/* Desktop: 4-column grid, all visible side by side. */}
          <div className="hidden md:grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                items={tasksByStatus[col.id]}
                onMove={moveTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        </>
      )}

      {composerOpen && activeArtist && (
        <TaskComposer
          artistProfileId={activeArtist.id}
          onClose={() => setComposerOpen(false)}
          onSaved={() => {
            setComposerOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  items,
  onMove,
  onDelete,
}: {
  column: { id: Status; label: string; hint: string; tone: string; icon: any };
  items: Task[];
  onMove: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = column.icon;
  return (
    <div
      className={cn(
        'rounded-xl border bg-card/50 backdrop-blur-xl',
        column.tone,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{column.label}</h2>
          <Badge variant="muted" className="font-mono text-[10px]">
            {items.length}
          </Badge>
        </div>
        <span className="hidden text-[10px] text-muted-foreground md:inline">
          {column.hint}
        </span>
      </div>
      <ul className="space-y-2 p-2 min-h-[120px]">
        {items.length === 0 && (
          <li className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
            Nessun task.
          </li>
        )}
        {items.map((t) => (
          <li key={t.id}>
            <TaskCard
              task={t}
              onMove={(s) => onMove(t.id, s)}
              onDelete={() => onDelete(t.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (s: Status) => void;
  onDelete: () => void;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && task.status !== 'done' && due < new Date();
  const tone = PRIORITY_TONE[task.priority];

  const nextStatus: Record<Status, Status | null> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: null,
    blocked: 'todo',
  };

  return (
    <div
      className={cn(
        'group rounded-lg border border-border/60 bg-background/60 p-3 transition-all hover:border-accent/40',
        task.status === 'done' && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            task.status === 'done' && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
        <Badge variant="muted" className={cn('shrink-0 text-[10px]', tone.tone)}>
          <Flag className="mr-1 h-2.5 w-2.5" />
          {tone.label}
        </Badge>
      </div>
      {task.description && (
        <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        {due && (
          <span className={cn('inline-flex items-center gap-1', overdue && 'text-rose-300')}>
            <Calendar className="h-3 w-3" />
            {due.toLocaleDateString()}
          </span>
        )}
        {task.lessonSlug && (
          <Link
            href={`/lesson/${task.lessonSlug}`}
            className="rounded bg-accent/10 px-1.5 py-0.5 text-accent hover:bg-accent/20"
          >
            ↗ {task.lessonSlug}
          </Link>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {nextStatus[task.status] && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMove(nextStatus[task.status]!)}
              // min-h-[36px] is the visual floor for in-card actions; a full
              // 44px would push the card to 2-3 lines taller.
              className="h-9 min-h-[36px] gap-1 px-2.5 text-xs"
            >
              <Check className="h-3 w-3" />
              {task.status === 'todo'
                ? 'Inizia'
                : task.status === 'in_progress'
                  ? 'Completa'
                  : 'Sblocca'}
            </Button>
          )}
          {task.status === 'todo' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove('blocked')}
              className="h-9 min-h-[36px] gap-1 px-2.5 text-xs text-amber-300 hover:bg-amber-500/10"
            >
              <AlertCircle className="h-3 w-3" />
              Blocco
            </Button>
          )}
          {(task.status === 'in_progress' || task.status === 'blocked') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove('todo')}
              className="h-9 min-h-[36px] gap-1 px-2.5 text-xs"
            >
              <CircleDashed className="h-3 w-3" />
              Indietro
            </Button>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-9 w-9 min-h-[36px] opacity-70 transition-opacity group-hover:opacity-100"
          aria-label="Elimina task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TaskComposer({
  artistProfileId,
  onClose,
  onSaved,
}: {
  artistProfileId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [lessonSlug, setLessonSlug] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          artistProfileId,
          title,
          description: description || undefined,
          expectedOutput: expectedOutput || undefined,
          priority,
          dueDate: dueDate || undefined,
          lessonSlug: lessonSlug || undefined,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Nuovo task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Titolo (es. Rispondi alle 5 domande di posizionamento)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Descrizione"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Output atteso (es. Documento con 5 risposte + 1 frase)"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Priorità</span>
              <div className="inline-flex flex-wrap gap-1 rounded-md border border-input bg-background/40 p-0.5">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs transition-colors',
                      priority === p
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Input
            placeholder="Lesson slug (opzionale, es. branding-parte-uno)"
            value={lessonSlug}
            onChange={(e) => setLessonSlug(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button variant="gradient" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salva task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
