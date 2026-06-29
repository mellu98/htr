import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  PlayCircle,
  Sparkles,
  ListChecks,
  ChevronRight,
  Check,
  Lock,
  Video,
  ArrowRight,
} from 'lucide-react';
import { course } from '@/lib/course';
import {
  getAllLessonRuntimeStatuses,
  getCourseOverview,
} from '@/lib/db/queries';
import { runtimeOverallCompletion } from '@/lib/status';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { cn, formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  const [overview, statuses] = await Promise.all([
    getCourseOverview(),
    getAllLessonRuntimeStatuses(),
  ]);

  // "Continue from here" = first lesson that's imported but not yet completed.
  const statusBySlug = Object.fromEntries(statuses.map((s) => [s.lessonSlug, s]));
  const continueLesson = course.lessons.find((l) => {
    const s = statusBySlug[l.slug];
    if (!s) return false;
    return s.videoPresent && !s.progress.completed;
  });

  // "What to do today" = next 3 pending lessons with progress > 0 OR not started but imported.
  const todayQueue = course.lessons
    .filter((l) => statusBySlug[l.slug]?.videoPresent)
    .filter((l) => !statusBySlug[l.slug]?.progress.completed)
    .slice(0, 3);

  const lessonsToReview = statuses.filter((s) => s.generated.analysis && s.reviewStatus !== 'approved');

  const recent = [...statuses]
    .filter((s) => s.progress.videoPercent > 0)
    .sort((a, b) => b.progress.videoPercent - a.progress.videoPercent)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-background p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              {course.category}
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="gradient-text">{course.title}</span>
            </h1>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              {course.subtitle}. {course.totalLessons} lezioni · 3 moduli ·{' '}
              {overview.videoImported} video importati · {overview.aiCompleted} analisi AI.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {continueLesson ? (
                <Button asChild size="lg" variant="gradient" className="gap-2">
                  <Link href={`/lesson/${continueLesson.slug}`}>
                    <PlayCircle className="h-4 w-4" />
                    Continua: {continueLesson.title}
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="gradient" className="gap-2">
                  <Link href="/library">
                    <PlayCircle className="h-4 w-4" />
                    Inizia la libreria
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-mono text-5xl font-bold tracking-tighter gradient-text">
              {overview.videoImported}/{overview.totalLessons}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Video importati
            </span>
          </div>
        </div>
      </section>

      {/* Top metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Lezioni totali" value={overview.totalLessons} icon={Video} tone="violet" hint={`${course.modules.length} moduli`} />
        <MetricCard label="Video importati" value={`${overview.videoImported}/${overview.totalLessons}`} icon={PlayCircle} tone="cyan" hint="In /public/videos" />
        <MetricCard label="Analisi AI completate" value={overview.aiCompleted} icon={Sparkles} tone="blue" hint="lesson-analysis.json" />
        <MetricCard label="Trascrizioni" value={overview.transcripts} icon={ListChecks} tone="success" hint={`${overview.checklists} checklist`} />
      </section>

      {/* Progress cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <ProgressCard
          title="Progress video"
          description="Media % vista su tutte le lezioni importate"
          value={overview.videoProgressPercent}
        />
        <ProgressCard
          title="Progress studio"
          description="Lezioni completate"
          value={overview.studyProgressPercent}
          meta={`${overview.lessonsCompleted} su ${overview.totalLessons}`}
        />
        <ProgressCard
          title="Progress applicazione"
          description="Lezioni applicate nella pratica"
          value={overview.applicationProgressPercent}
          meta={`${overview.lessonsApplied} su ${overview.totalLessons}`}
        />
      </section>

      {/* Continue + Today */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Cosa fare oggi</h2>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/library">
                  Tutta la libreria <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {todayQueue.length === 0 ? (
              <EmptyState
                title="Nessuna lezione pronta"
                description="Importa i video in /public/videos o lancia npm run analyze:all per generare i contenuti."
              />
            ) : (
              <ul className="space-y-2">
                {todayQueue.map((lesson) => {
                  const s = statusBySlug[lesson.slug];
                  const pct = s?.progress.videoPercent ?? 0;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/lesson/${lesson.slug}`}
                        className="group flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-4 transition-all hover:border-accent/40 hover:bg-accent/5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-lg shadow-primary/30">
                          <PlayCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{lesson.title}</p>
                            <Badge variant="muted" className="hidden md:inline-flex">
                              {lesson.moduleTitle}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <Progress
                              value={pct}
                              className="h-1.5 flex-1 max-w-[200px]"
                              indicatorClassName="bg-gradient-brand"
                            />
                            <span className="font-mono text-xs text-muted-foreground">
                              {pct}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {lesson.duration}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Continua da qui</h2>
            {continueLesson ? (
              <Link
                href={`/lesson/${continueLesson.slug}`}
                className="group block rounded-xl border border-accent/30 bg-accent/5 p-4 transition-colors hover:bg-accent/10"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-white shadow">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-tight">
                      {continueLesson.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {continueLesson.moduleTitle}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">
                    {statusBySlug[continueLesson.slug]?.progress.videoPercent ?? 0}% visto
                  </span>
                  <span className="inline-flex items-center gap-1 text-accent">
                    Riprendi <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ) : (
              <EmptyState
                title="Tutto fatto"
                description="Hai completato tutte le lezioni importate. Aggiungi nuovi video o lancia analyze:all."
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Review + Recent */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Lezioni da revisionare</h2>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/review">
                  Review Center <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {lessonsToReview.length === 0 ? (
              <EmptyState
                title="Tutto in ordine"
                description="Nessuna lezione in attesa di review."
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {lessonsToReview.slice(0, 6).map((s) => {
                  const lesson = course.lessons.find((l) => l.slug === s.lessonSlug);
                  if (!lesson) return null;
                  return (
                    <li key={s.lessonSlug}>
                      <Link
                        href={`/lesson/${lesson.slug}`}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lesson.title}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {s.reviewStatus.replace('_', ' ')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Ultimi video studiati</h2>
            {recent.length === 0 ? (
              <EmptyState
                title="Nessuna attività"
                description="Inizia una lezione per vedere lo storico qui."
              />
            ) : (
              <ul className="space-y-3">
                {recent.map((s) => {
                  const lesson = course.lessons.find((l) => l.slug === s.lessonSlug);
                  if (!lesson) return null;
                  return (
                    <li key={s.lessonSlug} className="flex items-center gap-3">
                      <StatusDot present={s.videoPresent} completed={s.progress.completed} />
                      <Link
                        href={`/lesson/${lesson.slug}`}
                        className="min-w-0 flex-1 truncate text-sm hover:text-accent"
                      >
                        {lesson.title}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.progress.videoPercent}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusDot({
  present,
  completed,
}: {
  present: boolean;
  completed: boolean;
}) {
  if (!present) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40">
        <Lock className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  }
  if (completed) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand shadow">
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
  );
}
