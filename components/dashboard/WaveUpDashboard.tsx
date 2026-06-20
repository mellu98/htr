import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Flame,
  ListChecks,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { course } from '@/lib/course';
import { getActiveArtist } from '@/lib/db/wave-up-queries';
import { getCourseOverview } from '@/lib/db/queries';
import { BRAND } from '@/lib/wave-up/brand';
import { summarizeCourseStatuses, type CourseStatusSummary } from '@/lib/status-server';
import { getAllLessonRuntimeStatuses } from '@/lib/db/queries';

interface ActiveTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  expectedOutput: string | null;
}

export default async function WaveUpDashboard({
  tasks,
  taskStats,
  recentLessons,
}: {
  tasks: ActiveTask[];
  taskStats: { total: number; todo: number; inProgress: number; done: number; blocked: number; overdue: number };
  recentLessons: { slug: string; title: string; percent: number; moduleTitle: string }[];
}) {
  const [artist, courseOverview, statusesList] = await Promise.all([
    getActiveArtist(),
    getCourseOverview(),
    getAllLessonRuntimeStatuses(),
  ]);

  const summary: CourseStatusSummary = summarizeCourseStatuses(statusesList);

  if (!artist) {
    return <OnboardingHero />;
  }

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const dueSoon = openTasks
    .filter((t) => t.dueDate && t.status !== 'done')
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 3);

  const courseProgress = courseOverview.lessonsCompleted;
  const courseTotal = courseOverview.totalLessons;
  const coursePercent = courseTotal
    ? Math.round((courseProgress / courseTotal) * 100)
    : 0;

  const nextAction = pickNextAction(openTasks, blockedTasks, artist);

  const weeklyPlan = buildWeeklyPlan(openTasks, dueSoon);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-background p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              {BRAND.course.name} · Coach attivo
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ciao, <span className="gradient-text">{artist.artistName}</span>.
            </h1>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              {artist.mainGoal
                ? `Stiamo lavorando su: ${artist.mainGoal}`
                : 'Definisci il main goal dall\'Artist Profile per allineare il coach.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="lg" variant="gradient" className="gap-2">
                <Link href="/coach">
                  <MessageCircle className="h-4 w-4" />
                  Apri il Coach
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/tasks">
                  <ListChecks className="h-4 w-4" />
                  Tasks ({openTasks.length})
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="gap-2">
                <Link href="/call-prep">
                  <CalendarClock className="h-4 w-4" />
                  Call Prep
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            {artist.nextCallAt && (
              <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-wider text-violet-300">
                  Prossima call
                </p>
                <p className="mt-1 font-mono text-base font-semibold text-violet-100">
                  {new Date(artist.nextCallAt).toLocaleString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            <NextActionCallout text={nextAction} />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Task aperti"
          value={openTasks.length}
          icon={CircleDashed}
          tone="violet"
          hint={`${taskStats.inProgress} in corso · ${taskStats.todo} da fare`}
        />
        <MetricCard
          label="Task bloccati"
          value={taskStats.blocked}
          icon={Flame}
          tone={taskStats.blocked > 0 ? 'warning' : 'muted'}
          hint={taskStats.overdue > 0 ? `${taskStats.overdue} in ritardo` : 'nessun ritardo'}
        />
        <MetricCard
          label="Progresso corso"
          value={`${courseProgress}/${courseTotal}`}
          icon={Brain}
          tone="blue"
          hint={`${coursePercent}% applicato · ${courseOverview.videoProgressPercent}% video`}
        />
        <MetricCard
          label="Coach disponibile"
          value="24/7"
          icon={MessageCircle}
          tone="cyan"
          hint="Nessuna API live · tutto locale"
        />
      </section>

      {/* Next action + weekly plan */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-brand" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-accent" />
              Prossima azione consigliata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NextActionCoach openTasks={openTasks} blocked={blockedTasks} />
            {dueSoon.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  In scadenza
                </p>
                <ul className="space-y-2">
                  {dueSoon.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        {t.expectedOutput && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            Output: {t.expectedOutput}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge
                          variant={
                            t.priority === 'urgent'
                              ? 'warning'
                              : t.priority === 'high'
                                ? 'cyan'
                                : 'muted'
                          }
                        >
                          {t.priority}
                        </Badge>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {t.dueDate && new Date(t.dueDate).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-accent" />
              Piano settimanale
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Suggerito dal coach, basato sui task aperti.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {weeklyPlan.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/60 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">{p.detail}</p>
                </div>
              </div>
            ))}
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href="/coach">
                Chiedi al Coach <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Course progress + recent lessons */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-accent" />
              Progresso percorso HTR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="font-mono text-4xl font-bold gradient-text">
                {courseProgress}/{courseTotal}
              </span>
              <span className="text-xs text-muted-foreground">lezioni applicate</span>
            </div>
            <Progress
              value={coursePercent}
              className="h-2"
              indicatorClassName="bg-gradient-brand"
            />
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
              <SmallStat label="Video importati" value={`${summary.videoImportedCount}/${summary.totalLessons}`} />
              <SmallStat label="Analisi AI" value={`${summary.aiGeneratedCount}/${summary.totalLessons}`} />
              <SmallStat label="Da importare" value={`${summary.missingVideosCount}`} />
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/library">
                Apri la libreria <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ultime lezioni studiate</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLessons.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
                Nessuna lezione ancora iniziata. Vai su{' '}
                <Link href="/library" className="text-accent hover:underline">
                  libreria
                </Link>{' '}
                per partire.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentLessons.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/lesson/${l.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {l.moduleTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={l.percent}
                          className="h-1.5 w-24"
                          indicatorClassName="bg-gradient-brand"
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          {l.percent}%
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function OnboardingHero() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand shadow-2xl shadow-primary/40">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="gradient-text">{BRAND.name}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{BRAND.tagline}</p>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Inizia creando il tuo primo profilo artista. Sarà la base su cui il
        Coach ragiona per tutta la settimana.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild size="lg" variant="gradient">
          <Link href="/artist-profile">
            <Sparkles className="h-4 w-4" />
            Crea il tuo primo artista
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/library">Sfoglia il corso</Link>
        </Button>
      </div>
    </div>
  );
}

function NextActionCallout({ text }: { text: string }) {
  return (
    <div className="max-w-md rounded-xl border border-accent/30 bg-accent/5 p-4 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-accent">
        Prossima azione singola
      </p>
      <p className="mt-1 text-sm leading-snug">{text}</p>
    </div>
  );
}

function NextActionCoach({
  openTasks,
  blocked,
}: {
  openTasks: ActiveTask[];
  blocked: ActiveTask[];
}) {
  if (blocked.length > 0) {
    return (
      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
        <p className="font-medium text-amber-200">Hai {blocked.length} task bloccato.</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Un blocco che dura più di 5 giorni non è un blocco: è una decisione
          che stai evitando. Affrontalo oggi.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-2 border-amber-400/50">
          <Link href="/tasks">Gestisci i task</Link>
        </Button>
      </div>
    );
  }
  if (openTasks.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
        <p className="font-medium text-emerald-200">Nessun task aperto.</p>
        <p className="mt-1 text-xs text-emerald-100/80">
          Il coach è il tuo prossimo passo: chiedigli il piano della prossima
          settimana.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href="/coach">Parla col Coach</Link>
        </Button>
      </div>
    );
  }
  const top = openTasks.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))[0];
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Task #1 adesso
      </p>
      <p className="mt-1 font-medium">{top.title}</p>
      {top.expectedOutput && (
        <p className="mt-1 text-xs text-muted-foreground">
          Output atteso: {top.expectedOutput}
        </p>
      )}
      <Button asChild size="sm" variant="gradient" className="mt-3">
        <Link href="/tasks">
          <ListChecks className="h-4 w-4" />
          Vai al Kanban
        </Link>
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone: 'cyan' | 'violet' | 'blue' | 'warning' | 'muted';
  hint?: string;
}) {
  const toneClass = {
    cyan: 'from-cyan-500/10 to-cyan-500/0 text-cyan-400',
    violet: 'from-violet-500/10 to-violet-500/0 text-violet-400',
    blue: 'from-blue-500/10 to-blue-500/0 text-blue-400',
    warning: 'from-amber-500/10 to-amber-500/0 text-amber-400',
    muted: 'from-white/5 to-white/0 text-muted-foreground',
  }[tone];

  return (
    <Card className="relative overflow-hidden">
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', toneClass.split(' ').slice(0, 2).join(' '))} />
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border',
            toneClass.split(' ').slice(2).join(' '),
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2 text-center">
      <p className="font-mono text-sm">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function priorityRank(p: string): number {
  switch (p) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function pickNextAction(
  openTasks: ActiveTask[],
  blocked: ActiveTask[],
  artist: { biggestBlock: string | null },
): string {
  if (blocked.length > 0) {
    return `Sblocca "${blocked[0].title}" — è la decisione che stai evitando.`;
  }
  if (openTasks.length > 0) {
    const top = [...openTasks].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))[0];
    return `Lavora su "${top.title}". Nient'altro finché non è fatto.`;
  }
  if (artist.biggestBlock) {
    return `Affronta il blocco: ${artist.biggestBlock}.`;
  }
  return 'Apri il Coach e fatti guidare. La prossima mossa non è ovvia.';
}

function buildWeeklyPlan(
  openTasks: ActiveTask[],
  dueSoon: ActiveTask[],
): { title: string; detail: string }[] {
  const sorted = [...openTasks].sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
  );
  const slots: { title: string; detail: string }[] = [];
  if (sorted[0]) {
    slots.push({
      title: `Priorità settimana: ${sorted[0].title}`,
      detail: sorted[0].expectedOutput
        ? `Output: ${sorted[0].expectedOutput}`
        : 'Definisci l\'output atteso prima di iniziare.',
    });
  }
  if (sorted[1]) {
    slots.push({
      title: `Secondo task: ${sorted[1].title}`,
      detail: 'Lavora a metà settimana, dopo aver chiuso il primo.',
    });
  }
  if (sorted[2]) {
    slots.push({
      title: `Terzo task: ${sorted[2].title}`,
      detail: 'Solo se i primi due sono chiusi. Niente di meno.',
    });
  }
  if (slots.length === 0) {
    slots.push({
      title: 'Definisci la priorità della settimana',
      detail: 'Nessun task aperto: scegline uno ora, prima di perderla.',
    });
  }
  if (dueSoon.length > 0 && slots.length < 3) {
    slots.push({
      title: `In scadenza: ${dueSoon[0].title}`,
      detail: `Entro ${dueSoon[0].dueDate && new Date(dueSoon[0].dueDate).toLocaleDateString('it-IT')}.`,
    });
  }
  slots.push({
    title: 'Chiusura venerdì + Call Prep',
    detail: 'Review settimanale, pulizia Kanban, report pre-call.',
  });
  return slots.slice(0, 5);
}
