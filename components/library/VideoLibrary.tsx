'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter, Lock, Play, Search, Sparkles, ListChecks, FileText, Brain, HelpCircle, Layers, Lightbulb, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Lesson, LessonRuntimeStatus, AIStatus } from '@/lib/types';
import {
  AI_STATUS_LABEL,
  AI_STATUS_VARIANT,
  runtimeOverallCompletion,
  type CourseStatusSummary,
} from '@/lib/status';

interface VideoLibraryProps {
  lessons: Lesson[];
  statuses: Record<string, LessonRuntimeStatus | undefined>;
  summary: CourseStatusSummary;
}

type ModuleFilter = 'all' | string;

export function VideoLibrary({ lessons, statuses, summary }: VideoLibraryProps) {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'imported' | 'missing'>('all');
  const [aiFilter, setAiFilter] = useState<'all' | AIStatus>('all');

  const modules = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; title: string }[] = [];
    for (const l of lessons) {
      if (seen.has(l.moduleId)) continue;
      seen.add(l.moduleId);
      list.push({ id: l.moduleId, title: l.moduleTitle });
    }
    return list;
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => {
      const s = statuses[l.slug];
      if (moduleFilter !== 'all' && l.moduleId !== moduleFilter) return false;
      if (presenceFilter === 'imported' && !(s?.videoPresent ?? false)) return false;
      if (presenceFilter === 'missing' && (s?.videoPresent ?? false)) return false;
      if (aiFilter !== 'all' && (s?.aiStatus ?? 'not_analyzed') !== aiFilter) return false;
      if (q) {
        const haystack = `${l.title} ${l.slug} ${l.moduleTitle}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, statuses, query, moduleFilter, presenceFilter, aiFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Video Library</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.totalLessons} lezioni · {summary.videoImportedCount}/{summary.totalLessons} video presenti · {summary.aiGeneratedCount}/{summary.totalLessons} analizzate · {summary.missingVideosCount} da importare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ai">
              <Sparkles className="h-4 w-4" />
              AI Processing
            </Link>
          </Button>
        </div>
      </header>

      {/*
        Filters — on mobile collapsed inside <details> to save vertical
        space; on desktop the same controls render inline because flex-wrap
        keeps them on a single row.
      */}
      <details className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl md:!open" open>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 py-3 touch-manipulation md:cursor-default">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filtri
            {(moduleFilter !== 'all' || presenceFilter !== 'all' || aiFilter !== 'all' || query) && (
              <Badge variant="cyan" className="font-mono text-[10px]">
                attivi
              </Badge>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground md:hidden">
            Tocca per aprire
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-border/60 p-4 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full min-w-0 md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per titolo, slug o modulo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:flex-1">
            <FilterPill
              icon={Layers}
              label="Modulo"
              value={moduleFilter}
              options={[
                { value: 'all', label: 'Tutti' },
                ...modules.map((m) => ({ value: m.id, label: shortModule(m.title) })),
              ]}
              onChange={setModuleFilter}
            />
            <FilterPill
              icon={Play}
              label="Video"
              value={presenceFilter}
              options={[
                { value: 'all', label: 'Tutti' },
                { value: 'imported', label: 'Importati' },
                { value: 'missing', label: 'Mancanti' },
              ]}
              onChange={(v) => setPresenceFilter(v as any)}
            />
            <FilterPill
              icon={Brain}
              label="AI"
              value={aiFilter}
              options={[
                { value: 'all', label: 'Tutto' },
                ...(['not_analyzed', 'generated', 'reviewed', 'approved', 'error'] as AIStatus[]).map((s) => ({
                  value: s,
                  label: AI_STATUS_LABEL[s],
                })),
              ]}
              onChange={(v) => setAiFilter(v as any)}
            />
          </div>
        </div>
      </details>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <Filter className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Nessuna lezione corrisponde ai filtri.</p>
            <p className="text-xs text-muted-foreground">
              Prova a ridurre i filtri o a cercare un altro termine.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((lesson) => (
            <VideoCard
              key={lesson.id}
              lesson={lesson}
              status={statuses[lesson.slug]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({
  lesson,
  status,
}: {
  lesson: Lesson;
  status?: LessonRuntimeStatus;
}) {
  const present = status?.videoPresent ?? false;
  const aiStatus: AIStatus = status?.aiStatus ?? 'not_analyzed';
  const overall = status ? runtimeOverallCompletion(status) : 0;
  const videoPct = status?.progress.videoPercent ?? 0;

  return (
    <Link
      href={`/lesson/${lesson.slug}`}
      className="group relative block overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl transition-all hover:border-accent/40 hover:shadow-2xl hover:shadow-primary/10"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-cyan-950">
        <div className="absolute inset-0 bg-mesh-dark opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.4),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.4),transparent_50%)]" />
        <div className="absolute inset-0 flex items-end justify-between p-3">
          <span className="rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/90 backdrop-blur">
            #{String(lesson.order).padStart(2, '0')}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] text-white/90 backdrop-blur">
            <Clock className="h-3 w-3" />
            {lesson.duration}
          </span>
        </div>
        {!present && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-xs">
              <Lock className="h-3.5 w-3.5" /> Video mancante
            </span>
          </div>
        )}
        {present && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand shadow-2xl shadow-primary/40 transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        )}
        {/* AI status pill */}
        <div className="absolute right-3 top-3">
          <Badge variant={AI_STATUS_VARIANT[aiStatus]}>
            {AI_STATUS_LABEL[aiStatus]}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 text-sm font-semibold leading-tight">
            {lesson.title}
          </p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            {shortModule(lesson.moduleTitle)}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Video</span>
            <span className="font-mono">{videoPct}%</span>
          </div>
          <Progress value={videoPct} className="h-1.5" indicatorClassName="bg-gradient-brand" />
        </div>

        {/* Output badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <OutputBadge enabled={!!status?.generated.transcript} icon={FileText} label="Transcript" />
          <OutputBadge enabled={!!status?.generated.summary} icon={Brain} label="Summary" />
          <OutputBadge enabled={!!status?.generated.checklist} icon={ListChecks} label="Checklist" />
          <OutputBadge enabled={!!status?.generated.quiz} icon={HelpCircle} label="Quiz" />
          <OutputBadge enabled={!!status?.generated.flashcards} icon={Lightbulb} label="Cards" />
          <OutputBadge enabled={!!status?.generated.analysis} icon={Sparkles} label="Analysis" />
        </div>

        {/* Overall */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-muted-foreground">Overall</span>
          <span className="font-mono gradient-text">{overall}%</span>
        </div>
      </div>
    </Link>
  );
}

function OutputBadge({
  enabled,
  icon: Icon,
  label,
}: {
  enabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
        enabled
          ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30'
          : 'bg-muted/40 text-muted-foreground/60 ring-1 ring-inset ring-border',
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function FilterPill<T extends string>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    // `flex flex-wrap` lets the option buttons wrap onto multiple lines inside
    // the pill on narrow screens (was the main overflow culprit — with 14
    // module options the pill was wider than the viewport). `max-w-full` +
    // `min-w-0` ensure the pill honours its container width.
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1 rounded-md border border-input bg-background/40 p-0.5">
      <span className="inline-flex shrink-0 items-center gap-1 px-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          // min-h-[36px] is the visual minimum that keeps the FilterPill row
          // compact (40px+ breaks the inline layout). touch-manipulation
          // removes the 300ms tap delay so the filter feels instant. shrink-0
          // keeps the active state pill from collapsing.
          className={cn(
            'inline-flex shrink-0 min-h-[36px] items-center rounded px-3 py-1.5 text-xs touch-manipulation transition-colors',
            value === opt.value
              ? 'bg-accent/20 text-accent'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function shortModule(title: string): string {
  return title
    .replace(/^Modulo\s+\d+\s*[—-]\s*/i, '')
    .trim();
}
