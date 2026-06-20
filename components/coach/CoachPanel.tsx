'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bot, Loader2, Plus, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import {
  COACH_PROMPTS,
  type CoachPromptId,
  type CoachResponse,
} from '@/lib/wave-up/coach';
import type { Lesson } from '@/lib/types';

interface ActiveArtist {
  id: string;
  artistName: string;
  musicGenre: string | null;
  mainGoal: string | null;
  biggestBlock: string | null;
  nextCallAt: string | null;
}

interface CoachContextPayload {
  artist: ActiveArtist | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    expectedOutput: string | null;
  }[];
  activeTaskCount: number;
  blockedTaskCount: number;
  nextCallAt: string | null;
}

interface CoachPanelProps {
  activeArtist: ActiveArtist | null;
  lessons: Lesson[];
  initialHistory: HistoryTurn[];
  initialContext: CoachContextPayload;
}

interface HistoryTurn {
  id: string;
  promptLabel: string;
  coachResponse: string;
  sources: string[];
  createdAt: string;
}

export function CoachPanel({
  activeArtist,
  lessons,
  initialHistory,
  initialContext,
}: CoachPanelProps) {
  const [activeId, setActiveId] = useState<CoachPromptId>('positioning');
  const [lessonSlug, setLessonSlug] = useState<string>(lessons[0]?.slug ?? '');
  const [response, setResponse] = useState<CoachResponse | null>(null);
  const [history, setHistory] = useState<HistoryTurn[]>(initialHistory);
  const [pending, startTransition] = useTransition();

  function handleAsk(id: CoachPromptId) {
    setActiveId(id);
    startTransition(async () => {
      try {
        const res = await fetch('/api/coach/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ promptId: id, lessonSlug }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        const out = json.response as CoachResponse;
        setResponse(out);
        // Persist to DB.
        const persist = await fetch('/api/coach/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            promptId: id,
            promptLabel: COACH_PROMPTS.find((p) => p.id === id)?.label ?? id,
            coachResponse: out.body,
            sources: out.sourcesUsed,
            artistProfileId: activeArtist?.id,
          }),
        });
        const persistJson = await persist.json();
        if (persistJson.turn) {
          setHistory((prev) => [
            { ...persistJson.turn, sources: out.sourcesUsed },
            ...prev,
          ]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore';
        setResponse({
          promptId: id,
          title: 'Coach temporaneamente non disponibile',
          body: `Non sono riuscito a ragionare sul tuo contesto: ${message}`,
          sourcesUsed: [],
          suggestedTasks: [],
        });
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Wave Up Coach</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Coach AI 24/7 per artisti e manager. Risponde a partire dal tuo
            profilo, dai task aperti e dai contenuti del corso HTR Training.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={activeArtist ? 'cyan' : 'warning'}>
            {activeArtist ? `Profilo attivo: ${activeArtist.artistName}` : 'Nessun profilo'}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt rapidi</CardTitle>
              <p className="text-xs text-muted-foreground">
                Otto punti di ingresso. Scegline uno: il coach ragiona sul tuo contesto.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {COACH_PROMPTS.map((p) => {
                const isActive = p.id === activeId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAsk(p.id)}
                    disabled={pending}
                    className={cn(
                      'group w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'border-accent/50 bg-accent/10'
                        : 'border-border/60 bg-background/40 hover:bg-muted/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{p.label}</p>
                      <CategoryBadge category={p.category} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lezione di riferimento</CardTitle>
              <p className="text-xs text-muted-foreground">
                Seleziona una lezione del corso HTR Training per ancorare le risposte.
              </p>
            </CardHeader>
            <CardContent>
              <select
                value={lessonSlug}
                onChange={(e) => setLessonSlug(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-ring"
              >
                <option value="">Nessuna lezione</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.slug}>
                    {l.title}
                  </option>
                ))}
              </select>
              {lessonSlug && (
                <Link
                  href={`/lesson/${lessonSlug}`}
                  className="mt-2 inline-block text-xs text-accent hover:underline"
                >
                  Apri la lezione completa →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-brand" />
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-accent" />
                    {response?.title ?? 'Pronto a coachti'}
                  </CardTitle>
                  {response && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>Fonti:</span>
                      {response.sourcesUsed.length === 0 ? (
                        <Badge variant="muted">nessuna</Badge>
                      ) : (
                        response.sourcesUsed.map((s) => (
                          <Badge key={s} variant="muted">
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {pending ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sto ragionando sul tuo contesto…
                </div>
              ) : response ? (
                <>
                  <Markdown content={response.body} />

                  {response.suggestedTasks.length > 0 && activeArtist && (
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">Task suggeriti</p>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          1 click → Kanban
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {response.suggestedTasks.map((t, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{t.title}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {t.description}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={async () => {
                                const due = t.dueInDays
                                  ? new Date(Date.now() + t.dueInDays * 86400000).toISOString()
                                  : undefined;
                                await fetch('/api/tasks', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({
                                    artistProfileId: activeArtist.id,
                                    title: t.title,
                                    description: t.description,
                                    expectedOutput: t.expectedOutput,
                                    priority: t.priority,
                                    dueDate: due,
                                    coachPromptId: activeId,
                                    lessonSlug: lessonSlug || undefined,
                                  }),
                                });
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Aggiungi
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadText(response.title, response.body)}
                    >
                      <Save className="h-4 w-4" />
                      Esporta risposta
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Premi uno dei prompt a sinistra. Il coach è paziente, ma tu
                  no — rispondi a quello che ti chiede e poi torna con i task
                  compilati.
                </p>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4" /> Cronologia recente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.slice(0, 5).map((h) => (
                  <details
                    key={h.id}
                    className="rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{h.promptLabel}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3">
                      <Markdown content={h.coachResponse} />
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const variant =
    category === 'diagnostic'
      ? 'cyan'
      : category === 'planning'
        ? 'violet'
        : category === 'execution'
          ? 'blue'
          : 'success';
  return (
    <Badge variant={variant as any} className="text-[9px] uppercase tracking-wider">
      {category}
    </Badge>
  );
}

function downloadText(title: string, body: string) {
  const safe = title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coach-${safe}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
