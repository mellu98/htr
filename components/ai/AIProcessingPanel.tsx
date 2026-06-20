'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Play, Sparkles, Terminal, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Lesson, LessonRuntimeStatus } from '@/lib/types';
import type { CourseStatusSummary } from '@/lib/status';

interface AIProcessingPanelProps {
  lessons: Lesson[];
  statuses: Record<string, LessonRuntimeStatus | undefined>;
  summary: CourseStatusSummary;
  apiKeyConfigured: boolean;
}

type LogEntry = {
  ts: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
};

export function AIProcessingPanel({
  lessons,
  statuses,
  summary,
  apiKeyConfigured,
}: AIProcessingPanelProps) {
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'error'>('pending');

  function log(level: LogEntry['level'], message: string) {
    setLogs((prev) => [
      ...prev,
      { ts: new Date().toLocaleTimeString(), level, message },
    ]);
  }

  async function analyzeOne(slug: string) {
    setBusy(true);
    log('info', `→ npm run analyze:video -- ${slug}`);
    try {
      // The analyze CLI runs server-side; we surface a mock run here.
      // In a real deployment this could call an internal route that
      // shells out to the script. For now we log and instruct.
      await new Promise((r) => setTimeout(r, 600));
      log(
        'success',
        `✓ Output generated in content/generated/${slug}/ (transcript, summary, checklist, quiz, flashcards, action-plan, lesson-analysis).`,
      );
      log(
        'warn',
        'UI mock: i file veri vengono scritti dallo script CLI. Esegui il comando in un terminale per generare i contenuti reali.',
      );
    } catch (e) {
      log('error', `Errore: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeAll() {
    setBusy(true);
    log('info', `→ npm run analyze:all`);
    for (const lesson of lessons) {
      log('info', `  · ${lesson.slug}`);
    }
    log(
      'success',
      '✓ Comando pronto. Eseguilo in un terminale per popolare /content/generated/.',
    );
    setBusy(false);
  }

  const filtered = lessons.filter((l) => {
    const s = statuses[l.slug];
    const hasAnalysis = !!s?.generated.analysis;
    if (filter === 'pending') return !hasAnalysis;
    if (filter === 'done') return hasAnalysis;
    if (filter === 'error') return s?.aiStatus === 'error';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">AI Processing</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {summary.aiGeneratedCount}/{summary.totalLessons} generated · {summary.aiPendingCount}/{summary.totalLessons} not_analyzed · {summary.missingVideosCount} video mancanti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={apiKeyConfigured ? 'success' : 'muted'}>
            {apiKeyConfigured ? 'API key configurata' : 'Modalità mock'}
          </Badge>
        </div>
      </header>

      {/* Command cheatsheet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comandi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CommandLine label="Genera una singola lezione" command="npm run analyze:video -- branding-parte-due" />
          <CommandLine label="Genera tutte le lezioni" command="npm run analyze:all" />
          <CommandLine label="Genera solo lezioni con video importato" command="npm run analyze:all -- --only-imported" />
          <CommandLine label="Rigenera il manifest dei contenuti" command="npm run generate:manifest" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Lezioni</CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="pending">Da analizzare</TabsTrigger>
                <TabsTrigger value="done">Analizzate</TabsTrigger>
                <TabsTrigger value="error">Errori</TabsTrigger>
                <TabsTrigger value="all">Tutte</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                Nessuna lezione in questo filtro.
              </p>
            ) : (
              <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto">
                {filtered.map((lesson) => {
                  const s = statuses[lesson.slug];
                  const status = s?.aiStatus ?? 'not_analyzed';
                  return (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lesson.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {lesson.moduleTitle} · {lesson.slug}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusPill status={status} />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => analyzeOne(lesson.slug)}
                          className="gap-1"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          Analyze
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
              <span className="text-xs text-muted-foreground">
                {filtered.length} lezioni · {lessons.length} totali
              </span>
              <Button
                size="sm"
                variant="gradient"
                disabled={busy}
                onClick={analyzeAll}
                className="gap-2"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze all
              </Button>
            </div>
          </CardContent>
        </Card>

        {/*
          Log panel — wrapped in a <details> on mobile so the long output
          doesn't push the lessons column out of the viewport. Desktop keeps
          the panel always visible via md:open.
        */}
        <Card className="overflow-hidden">
          <details className="group md:!open" open>
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between border-b border-border/60 px-4 py-3 touch-manipulation md:cursor-default">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span className="text-base font-semibold leading-none">Log</span>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <span className="text-[10px] text-muted-foreground md:hidden">
                Tocca per {logs.length > 0 ? 'chiudere' : 'aprire'}
              </span>
            </summary>
            <div className="p-4 pt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Output locale. Nessuna chiamata live dal browser.
              </p>
              <div className="max-h-[480px] overflow-y-auto rounded-md bg-black/40 p-3 font-mono text-xs leading-relaxed">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">
                    Premi "Analyze" su una lezione o "Analyze all" per simulare l'esecuzione.
                  </p>
                ) : (
                  logs.map((l, i) => <LogLine key={i} entry={l} />)
                )}
              </div>
            </div>
          </details>
        </Card>
      </div>
    </div>
  );
}

function CommandLine({ label, command }: { label: string; command: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <code className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-accent">
        {command}
      </code>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    not_analyzed: { label: 'Not analyzed', variant: 'muted' },
    generated: { label: 'Generated', variant: 'violet' },
    reviewed: { label: 'Reviewed', variant: 'blue' },
    approved: { label: 'Approved', variant: 'success' },
    error: { label: 'Error', variant: 'warning' },
    processing: { label: 'Processing', variant: 'cyan' },
  };
  const v = map[status] ?? map.not_analyzed;
  return (
    <Badge variant={v.variant} className="hidden sm:inline-flex">
      {v.label}
    </Badge>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const color =
    entry.level === 'error'
      ? 'text-rose-300'
      : entry.level === 'success'
        ? 'text-emerald-300'
        : entry.level === 'warn'
          ? 'text-amber-300'
          : 'text-cyan-300';
  return (
    <div className={cn('flex items-start gap-2', color)}>
      <span className="text-muted-foreground">[{entry.ts}]</span>
      <span className="inline-flex items-center gap-1">
        {entry.level === 'error' && <AlertCircle className="h-3 w-3" />}
        {entry.level === 'success' && <CheckCircle2 className="h-3 w-3" />}
      </span>
      <span className="flex-1 whitespace-pre-wrap">{entry.message}</span>
    </div>
  );
}
