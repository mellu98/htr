'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  ListChecks,
  MessageSquare,
  Send,
  Target,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReleaseDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string | null;
  mainGoal: string | null;
  notes: string | null;
  budget: number | null;
  platforms: string | null;
  artistProfileId: string;
  milestones: Milestone[];
  contentIdeas: ContentIdea[];
  metrics: Metric[];
  goals: Goal[];
  outreach: OutreachRow[];
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}
interface ContentIdea {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  hook: string | null;
  publishAt: string | null;
}
interface Metric {
  id: string;
  platform: string;
  date: string;
  followers: number | null;
  streams: number | null;
  views: number | null;
  linkClicks: number | null;
}
interface Goal {
  id: string;
  title: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  status: string;
  deadline: string | null;
}
interface OutreachRow {
  id: string;
  channel: string;
  status: string;
  contactName: string;
  message: string | null;
  nextFollowUpAt: string | null;
}

const TABS = [
  { id: 'overview', label: 'Panoramica', icon: ListChecks },
  { id: 'milestones', label: 'Milestone', icon: CheckSquare },
  { id: 'content', label: 'Calendario', icon: CalendarDays },
  { id: 'metrics', label: 'Numeri', icon: BarChart3 },
  { id: 'outreach', label: 'Contatti', icon: Send },
  { id: 'goals', label: 'Obiettivi', icon: Target },
  { id: 'coach', label: 'Brief Coach', icon: MessageSquare },
] as const;
type TabId = (typeof TABS)[number]['id'];

const STATUS_LABEL: Record<string, string> = {
  planning: 'In preparazione',
  pre_release: 'Pre-lancio',
  released: 'Uscito',
  post_release: 'Post-lancio',
  archived: 'Archiviato',
  todo: 'Da fare',
  in_progress: 'In corso',
  done: 'Fatto',
  blocked: 'Bloccato',
  idea: 'Idea',
  draft: 'Bozza',
  approved: 'Approvato',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  active: 'Attivo',
  achieved: 'Raggiunto',
  missed: 'Perso',
  to_contact: 'Da contattare',
  contacted: 'Contattato',
  replied: 'Risposto',
  interested: 'Interessato',
  rejected: 'Rifiutato',
  closed: 'Chiuso',
};

export function ReleaseDetailPanel({ release }: { release: ReleaseDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('overview');

  async function updateStatus(status: string) {
    await fetch(`/api/releases/${release.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {release.type} · {STATUS_LABEL[release.status] ?? release.status}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{release.title}</h1>
          {release.mainGoal && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              <Target className="mr-1 inline h-3.5 w-3.5" />
              {release.mainGoal}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {release.releaseDate && (
            <Badge variant="outline" className="font-mono">
              {new Date(release.releaseDate).toLocaleDateString('it-IT')}
            </Badge>
          )}
          <select
            value={release.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
          >
            {Object.entries(STATUS_LABEL)
              .filter(([k]) =>
                ['planning', 'pre_release', 'released', 'post_release', 'archived'].includes(k),
              )
              .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
          </select>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-card/40 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && <OverviewTab release={release} />}
      {tab === 'milestones' && <MilestonesTab release={release} onChange={() => router.refresh()} />}
      {tab === 'content' && <ContentTab release={release} onChange={() => router.refresh()} />}
      {tab === 'metrics' && <MetricsTab release={release} />}
      {tab === 'outreach' && <OutreachTab release={release} />}
      {tab === 'goals' && <GoalsTab release={release} />}
      {tab === 'coach' && <CoachBriefTab release={release} />}
    </div>
  );
}

function OverviewTab({ release }: { release: ReleaseDetail }) {
  const openMilestones = release.milestones.filter((m) => m.status !== 'done').length;
  const scheduledContent = release.contentIdeas.filter(
    (c) => c.status === 'scheduled' || c.status === 'approved',
  ).length;
  const activeGoals = release.goals.filter((g) => g.status === 'active').length;
  const pendingOutreach = release.outreach.filter(
    (o) => o.status === 'to_contact' || o.status === 'contacted',
  ).length;
  const nextMilestone = release.milestones
    .filter((m) => m.status !== 'done')
    .sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    })[0];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Stat label="Milestone aperti" value={`${openMilestones}/${release.milestones.length}`} />
      <Stat label="Contenuti pronti" value={`${scheduledContent}`} />
      <Stat label="Goal attivi" value={`${activeGoals}`} />
      <Stat label="Outreach pendenti" value={`${pendingOutreach}`} />
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-base">Prossimo passo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {nextMilestone ? (
            <>
              <p className="font-medium">{nextMilestone.title}</p>
              {nextMilestone.description && (
                <p className="text-muted-foreground">{nextMilestone.description}</p>
              )}
              {nextMilestone.dueDate && (
                <p className="text-xs text-muted-foreground">
                  Entro {new Date(nextMilestone.dueDate).toLocaleDateString('it-IT')}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Tutte le milestone sono chiuse. Aggiungine di nuove.</p>
          )}
          {release.notes && (
            <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Note</p>
              <p className="mt-1">{release.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MilestonesTab({
  release,
  onChange,
}: {
  release: ReleaseDetail;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function add() {
    if (!title.trim()) return;
    await fetch('/api/release-milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releaseId: release.id,
        title: title.trim(),
        dueDate: dueDate || null,
        priority: 'medium',
        status: 'todo',
      }),
    });
    setTitle('');
    setDueDate('');
    setAdding(false);
    onChange();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/release-milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onChange();
  }

  async function remove(id: string) {
    await fetch(`/api/release-milestones/${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Milestone di lancio</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Annulla' : 'Aggiungi milestone'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <div className="grid gap-2 rounded-md border border-border/60 bg-background/40 p-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Cover artwork approvata"
              className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm"
            />
            <Button size="sm" variant="gradient" onClick={add}>
              Salva
            </Button>
          </div>
        )}
        {release.milestones.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nessuna milestone. Aggiungi le tappe chiave del lancio.
          </p>
        ) : (
          release.milestones.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.title}</p>
                {m.description && (
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">
                {STATUS_LABEL[m.status] ?? m.status}
              </Badge>
              {m.dueDate && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(m.dueDate).toLocaleDateString('it-IT')}
                </span>
              )}
              <select
                value={m.status}
                onChange={(e) => setStatus(m.id, e.target.value)}
                className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
              >
                {['todo', 'in_progress', 'done', 'blocked'].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                ✕
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ContentTab({
  release,
  onChange,
}: {
  release: ReleaseDetail;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [format, setFormat] = useState('reel');

  async function add() {
    if (!title.trim()) return;
    await fetch('/api/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistProfileId: release.artistProfileId,
        releaseId: release.id,
        platform,
        format,
        title: title.trim(),
        status: 'idea',
      }),
    });
    setTitle('');
    setAdding(false);
    onChange();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Calendario contenuti</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Annulla' : 'Nuova idea'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <div className="grid gap-2 rounded-md border border-border/60 bg-background/40 p-3 md:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Reel storytelling sul ritornello"
              className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm"
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm"
            >
              {['instagram', 'tiktok', 'youtube', 'spotify', 'newsletter'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm"
            >
              {['reel', 'tiktok', 'carousel', 'post', 'story', 'short', 'live'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <Button size="sm" variant="gradient" onClick={add}>
              Salva
            </Button>
          </div>
        )}
        {release.contentIdeas.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nessun contenuto. Aggiungi le idee per il lancio.
          </p>
        ) : (
          release.contentIdeas.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.platform} · {c.format}
                  {c.hook && <> · {c.hook}</>}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {STATUS_LABEL[c.status] ?? c.status}
              </Badge>
              {c.publishAt && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(c.publishAt).toLocaleDateString('it-IT')}
                </span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MetricsTab({ release }: { release: ReleaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Numeri della release</CardTitle>
        <p className="text-xs text-muted-foreground">
          Snapshot manuali. Vai su <Link href="/metrics" className="text-accent hover:underline">Numeri</Link> per la dashboard globale.
        </p>
      </CardHeader>
      <CardContent>
        {release.metrics.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nessuno snapshot. Inseriscilo da <Link href="/metrics" className="text-accent hover:underline">Numeri</Link>.
          </p>
        ) : (
          <ul className="space-y-2">
            {release.metrics.slice(0, 10).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(m.date).toLocaleDateString('it-IT')} · {m.platform}
                </span>
                <span className="font-mono text-xs">
                  {[
                    m.followers != null && `${m.followers} follower`,
                    m.streams != null && `${m.streams} stream`,
                    m.views != null && `${m.views} views`,
                    m.linkClicks != null && `${m.linkClicks} click`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OutreachTab({ release }: { release: ReleaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contatti per il lancio</CardTitle>
        <p className="text-xs text-muted-foreground">
          Gestisci outreach globale da <Link href="/contacts" className="text-accent hover:underline">Contatti</Link>.
        </p>
      </CardHeader>
      <CardContent>
        {release.outreach.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nessun contatto ancora. Vai su Contatti per aggiungere curator, venue, press.
          </p>
        ) : (
          <ul className="space-y-2">
            {release.outreach.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
              >
                <span>
                  <Users className="mr-1 inline h-3 w-3 text-muted-foreground" />
                  {o.contactName} · {o.channel}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABEL[o.status] ?? o.status}
                </Badge>
                {o.nextFollowUpAt && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    follow-up {new Date(o.nextFollowUpAt).toLocaleDateString('it-IT')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsTab({ release }: { release: ReleaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Obiettivi della release</CardTitle>
      </CardHeader>
      <CardContent>
        {release.goals.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nessun obiettivo. Vai su <Link href="/goals" className="text-accent hover:underline">Obiettivi</Link> per crearne.
          </p>
        ) : (
          <ul className="space-y-2">
            {release.goals.map((g) => {
              const pct = g.targetValue > 0
                ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                : 0;
              return (
                <li
                  key={g.id}
                  className="rounded-md border border-border/60 bg-background/40 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{g.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {STATUS_LABEL[g.status] ?? g.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.currentValue} / {g.targetValue} {g.metric}
                    {g.deadline && (
                      <> · entro {new Date(g.deadline).toLocaleDateString('it-IT')}</>
                    )}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-gradient-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CoachBriefTab({ release }: { release: ReleaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brief di lancio</CardTitle>
        <p className="text-xs text-muted-foreground">
          Apri il coach e chiedi "Preparami il piano di lancio" per partire da qui.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <strong>Release:</strong> {release.title} ({release.type}) · {STATUS_LABEL[release.status]}
        </p>
        {release.mainGoal && (
          <p>
            <strong>Obiettivo:</strong> {release.mainGoal}
          </p>
        )}
        {release.releaseDate && (
          <p>
            <strong>Data di uscita:</strong>{' '}
            {new Date(release.releaseDate).toLocaleDateString('it-IT')}
          </p>
        )}
        <p>
          <strong>Milestone aperte:</strong>{' '}
          {release.milestones.filter((m) => m.status !== 'done').length} su {release.milestones.length}
        </p>
        <p>
          <strong>Contenuti pianificati:</strong> {release.contentIdeas.length}
        </p>
        <p>
          <strong>Goal attivi:</strong>{' '}
          {release.goals.filter((g) => g.status === 'active').length}
        </p>
        <p>
          <strong>Outreach pendenti:</strong>{' '}
          {release.outreach.filter((o) => o.status === 'to_contact' || o.status === 'contacted').length}
        </p>
        <Link
          href={`/coach?promptId=release-plan&releaseId=${release.id}`}
          className="mt-3 inline-flex items-center gap-1 text-accent hover:underline"
        >
          Apri il Coach per generare il piano →
        </Link>
      </CardContent>
    </Card>
  );
}