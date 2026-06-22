import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Disc3,
  Flame,
  ListChecks,
  MessageCircle,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wand2,
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

interface ActiveReleaseInfo {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string | null;
  mainGoal: string | null;
  openMilestones: number;
  totalMilestones: number;
  nextMilestone: { id: string; title: string; dueDate: string | null } | null;
}

interface TodayContent {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  publishAt: string | null;
}

interface OpenLoops {
  overdueMilestones: number;
  blockedTasks: number;
  overdueOutreach: number;
  staleGoals: number;
}

interface ActiveGoal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  metric: string;
  deadline: string | null;
}

export default async function WaveUpDashboard({
  tasks,
  taskStats,
  recentLessons,
  activeRelease,
  todaysContent,
  openLoops,
  activeGoals,
}: {
  tasks: ActiveTask[];
  taskStats: { total: number; todo: number; inProgress: number; done: number; blocked: number; overdue: number };
  recentLessons: { slug: string; title: string; percent: number; moduleTitle: string }[];
  activeRelease: ActiveReleaseInfo | null;
  todaysContent: TodayContent[];
  openLoops: OpenLoops;
  activeGoals: ActiveGoal[];
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

  const nextAction = pickNextAction(openTasks, blockedTasks, activeRelease, openLoops, artist.biggestBlock);

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
              {activeRelease && (
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link href={`/releases/${activeRelease.id}`}>
                    <Disc3 className="h-4 w-4" />
                    {activeRelease.title}
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="ghost" className="gap-2">
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

      {/* Operational grid: 4 sections, 5 priority order */}
      <section className="grid gap-4 lg:grid-cols-2">
        <NextActionSection
          openTasks={openTasks}
          blocked={blockedTasks}
          activeRelease={activeRelease}
          openLoops={openLoops}
        />
        <ActiveReleaseSection release={activeRelease} />
        <TodayContentSection items={todaysContent} />
        <CoachSuggestionSection
          openLoops={openLoops}
          activeRelease={activeRelease}
          activeGoalsCount={activeGoals.length}
        />
      </section>

      {/* Open loops — full width */}
      <OpenLoopsSection loops={openLoops} />

      {/* Goals + Metrics row */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ActiveGoalsSection goals={activeGoals} />
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-brand" />
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
            {(function () {
              const plan = buildWeeklyPlan(openTasks, dueSoon);
              return plan.map((p, i) => (
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
              ));
            })()}
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href="/coach">
                Chiedi al Coach <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Course progress + recent lessons (kept from original) */}
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

function NextActionSection({
  openTasks,
  blocked,
  activeRelease,
  openLoops,
}: {
  openTasks: ActiveTask[];
  blocked: ActiveTask[];
  activeRelease: ActiveReleaseInfo | null;
  openLoops: OpenLoops;
}) {
  if (blocked.length > 0) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-amber-400" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-amber-400" />
            Azione più importante di oggi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Hai <strong>{blocked.length} task bloccati</strong>. Un blocco che
            dura più di 5 giorni non è un blocco: è una decisione che stai
            evitando.
          </p>
          <p className="rounded-md border border-amber-400/30 bg-amber-500/10 p-2 text-xs">
            <strong>{blocked[0].title}</strong> — è il primo da affrontare.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/tasks">Gestisci i task</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (openLoops.overdueOutreach > 0) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-cyan-400" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-cyan-400" />
            Follow-up scaduti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Hai <strong>{openLoops.overdueOutreach} follow-up</strong> in
            ritardo. Un follow-up saltato brucia 3 settimane di relazione.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/contacts">Apri i contatti</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (openLoops.overdueMilestones > 0 && activeRelease) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-red-400" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDashed className="h-4 w-4 text-red-400" />
            Milestone in ritardo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <strong>{openLoops.overdueMilestones} milestone</strong> di{' '}
            <em>{activeRelease.title}</em> sono oltre la data. Stanno
            bloccando il piano.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/releases/${activeRelease.id}`}>Apri la release</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (openTasks.length > 0) {
    const top = [...openTasks].sort(
      (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
    )[0];
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-brand" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-accent" />
            Task #1 adesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-base font-medium">{top.title}</p>
          {top.expectedOutput && (
            <p className="text-xs text-muted-foreground">
              Output atteso: {top.expectedOutput}
            </p>
          )}
          <Button asChild size="sm" variant="gradient" className="mt-2">
            <Link href="/tasks">
              <ListChecks className="h-4 w-4" />
              Vai al Kanban
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-emerald-400" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Tutto chiuso per oggi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Nessun task aperto. È il momento perfetto per pianificare la
          prossima release, scrivere un contenuto, o aprire il coach.
        </p>
        <Button asChild size="sm" variant="gradient">
          <Link href="/coach">Parla col Coach</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveReleaseSection({ release }: { release: ActiveReleaseInfo | null }) {
  if (!release) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Disc3 className="h-4 w-4 text-accent" />
            Release attiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nessuna release in preparazione. Il cuore del sistema è vuoto.
          </p>
          <Button asChild size="sm" variant="gradient">
            <Link href="/releases">Pianifica la prima release</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-brand" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Disc3 className="h-4 w-4 text-accent" />
          Release attiva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/releases/${release.id}`}
            className="truncate text-base font-semibold hover:text-accent"
          >
            {release.title}
          </Link>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {release.status}
          </Badge>
        </div>
        {release.mainGoal && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{release.mainGoal}</p>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Milestone: {release.openMilestones}/{release.totalMilestones}
          </span>
          {release.releaseDate && (
            <span className="font-mono text-muted-foreground">
              {new Date(release.releaseDate).toLocaleDateString('it-IT')}
            </span>
          )}
        </div>
        {release.nextMilestone && (
          <p className="rounded-md border border-border/60 bg-background/40 p-2 text-xs">
            <strong>Prossimo:</strong> {release.nextMilestone.title}
            {release.nextMilestone.dueDate && (
              <span className="ml-1 font-mono text-muted-foreground">
                · {new Date(release.nextMilestone.dueDate).toLocaleDateString('it-IT')}
              </span>
            )}
          </p>
        )}
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/releases/${release.id}`}>
            Apri la release <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TodayContentSection({ items }: { items: TodayContent[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-accent" />
            Contenuti di oggi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Niente in programma per oggi. Vai su Contenuti per pianificare.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/content">Pianifica contenuti</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-accent" />
          Contenuti di oggi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 4).map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{c.title}</p>
              <p className="text-muted-foreground">
                {c.platform}/{c.format}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {c.status}
            </Badge>
          </div>
        ))}
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/content">
            Tutti i contenuti <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CoachSuggestionSection({
  openLoops,
  activeRelease,
  activeGoalsCount,
}: {
  openLoops: OpenLoops;
  activeRelease: ActiveReleaseInfo | null;
  activeGoalsCount: number;
}) {
  // Pick the most relevant prompt given current state.
  let promptId: string = 'release-plan';
  let label = 'Preparami il piano di lancio';
  let why = 'Hai una release attiva: meglio partire da qui.';
  if (openLoops.overdueOutreach > 3) {
    promptId = 'outreach-plan';
    label = 'Chi devo contattare?';
    why = 'Hai follow-up in ritardo che stanno bruciando relazioni.';
  } else if (activeGoalsCount === 0) {
    promptId = 'goal-check';
    label = 'Sto andando verso l\'obiettivo?';
    why = 'Senza obiettivi misurabili non sai se stai crescendo.';
  } else if (openLoops.staleGoals > 0) {
    promptId = 'goal-check';
    label = 'Sto andando verso l\'obiettivo?';
    why = 'Alcuni goal sono scaduti. È ora di guardarli in faccia.';
  } else {
    promptId = 'content-week';
    label = 'Cosa pubblico questa settimana?';
    why = 'Senza contenuto non c\'è crescita. Genera la settimana.';
  }
  if (!activeRelease) {
    promptId = 'goal-check';
    label = 'Sto andando verso l\'obiettivo?';
    why = 'Senza release, parti da un obiettivo chiaro.';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-accent" />
          Suggerimento del Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{why}</p>
        <Button asChild variant="gradient" size="sm" className="w-full">
          <Link href={`/coach?promptId=${promptId}`}>
            <MessageCircle className="h-3.5 w-3.5" />
            {label}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OpenLoopsSection({ loops }: { loops: OpenLoops }) {
  const total = loops.overdueMilestones + loops.blockedTasks + loops.overdueOutreach + loops.staleGoals;
  if (total === 0) {
    return (
      <Card className="border-emerald-400/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p>
            <strong>Nessun loop aperto.</strong> Tutto sotto controllo.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-4 w-4 text-amber-400" />
          Loop aperti
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cose che richiedono attenzione per non perdere il ritmo.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {loops.overdueMilestones > 0 && (
            <LoopPill
              href={null}
              count={loops.overdueMilestones}
              label="Milestone in ritardo"
              tone="red"
            />
          )}
          {loops.blockedTasks > 0 && (
            <LoopPill
              href="/tasks"
              count={loops.blockedTasks}
              label="Task bloccati"
              tone="amber"
            />
          )}
          {loops.overdueOutreach > 0 && (
            <LoopPill
              href="/contacts"
              count={loops.overdueOutreach}
              label="Follow-up scaduti"
              tone="cyan"
            />
          )}
          {loops.staleGoals > 0 && (
            <LoopPill
              href="/goals"
              count={loops.staleGoals}
              label="Goal oltre deadline"
              tone="violet"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoopPill({
  href,
  count,
  label,
  tone,
}: {
  href: string | null;
  count: number;
  label: string;
  tone: 'red' | 'amber' | 'cyan' | 'violet';
}) {
  const toneCls = {
    red: 'border-red-400/40 bg-red-500/10 text-red-300',
    amber: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
    cyan: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300',
    violet: 'border-violet-400/40 bg-violet-500/10 text-violet-300',
  }[tone];
  const inner = (
    <div className={cn('rounded-lg border p-3', toneCls)}>
      <p className="font-mono text-2xl font-bold">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

function ActiveGoalsSection({ goals }: { goals: ActiveGoal[] }) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-accent" />
            Obiettivi attivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessun goal. Senza numeri, stai andando a sensazione.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/goals">Definisci un obiettivo</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-accent" />
          Obiettivi attivi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.slice(0, 3).map((g) => {
          const pct = g.targetValue > 0
            ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
            : 0;
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{g.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {pct}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {g.currentValue}/{g.targetValue} {g.metric}
                {g.deadline && (
                  <> · entro {new Date(g.deadline).toLocaleDateString('it-IT')}</>
                )}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/60">
                <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        <Button asChild size="sm" variant="outline" className="mt-1 w-full">
          <Link href="/goals">
            Tutti gli obiettivi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
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
  activeRelease: ActiveReleaseInfo | null,
  openLoops: OpenLoops,
  biggestBlock: string | null,
): string {
  if (blocked.length > 0) {
    return `Sblocca "${blocked[0].title}" — è la decisione che stai evitando.`;
  }
  if (openLoops.overdueOutreach > 0) {
    return `${openLoops.overdueOutreach} follow-up sono in ritardo. Aprine uno oggi.`;
  }
  if (openLoops.overdueMilestones > 0 && activeRelease) {
    return `${openLoops.overdueMilestones} milestone di ${activeRelease.title} sono oltre la data.`;
  }
  if (openTasks.length > 0) {
    const top = [...openTasks].sort(
      (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
    )[0];
    return `Lavora su "${top.title}". Nient'altro finché non è fatto.`;
  }
  if (activeRelease) {
    return `${activeRelease.title} — aggiungi la prossima milestone.`;
  }
  if (biggestBlock) {
    return `Affronta il blocco: ${biggestBlock}.`;
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