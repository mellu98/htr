'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Disc3, ListChecks, Plus, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReleaseSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string | null;
  mainGoal: string | null;
  openMilestones: number;
  totalMilestones: number;
  scheduledContent: number;
  activeGoals: number;
  nextMilestone: { id: string; title: string; dueDate: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  planning: 'In preparazione',
  pre_release: 'Pre-lancio',
  released: 'Uscito',
  post_release: 'Post-lancio',
  archived: 'Archiviato',
};

const STATUS_TONE: Record<string, string> = {
  planning: 'border-violet-400/40 text-violet-300',
  pre_release: 'border-amber-400/40 text-amber-300',
  released: 'border-emerald-400/40 text-emerald-300',
  post_release: 'border-cyan-400/40 text-cyan-300',
  archived: 'border-border text-muted-foreground',
};

const TYPE_LABEL: Record<string, string> = {
  single: 'Singolo',
  ep: 'EP',
  album: 'Album',
  videoclip: 'Videoclip',
  live: 'Live',
  campaign: 'Campagna',
};

export function ReleasesPanel({
  activeArtist,
  releases,
}: {
  activeArtist: { id: string; artistName: string } | null;
  releases: ReleaseSummary[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeArtist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessun artista attivo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Crea prima il tuo artista da{' '}
          <Link href="/artist-profile" className="text-accent hover:underline">
            Artist Profile
          </Link>
          , poi torna qui per pianificare la prima release.
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        artistProfileId: activeArtist!.id,
        title: String(formData.get('title') ?? '').trim(),
        type: String(formData.get('type') ?? 'single'),
        status: String(formData.get('status') ?? 'planning'),
        releaseDate: formData.get('releaseDate') || null,
        mainGoal: formData.get('mainGoal') || null,
        notes: formData.get('notes') || null,
      };
      if (!payload.title) {
        setError('Il titolo è obbligatorio.');
        setSubmitting(false);
        return;
      }
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Errore nella creazione.');
        setSubmitting(false);
        return;
      }
      setShowForm(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Errore di rete.');
    } finally {
      setSubmitting(false);
    }
  }

  const active = releases.filter((r) => r.status !== 'archived' && r.status !== 'released');
  const past = releases.filter((r) => r.status === 'released' || r.status === 'archived');

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Prossime uscite
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Una release = un obiettivo chiaro con milestone, contenuti, outreach e numeri da guardare.
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm((v) => !v)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nuova release
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuova release</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(new FormData(e.currentTarget));
              }}
              className="grid gap-3 md:grid-cols-2"
            >
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Titolo *</span>
                <input
                  name="title"
                  required
                  placeholder='Es. "Notte Storta"'
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Tipo</span>
                <select
                  name="type"
                  defaultValue="single"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Stato</span>
                <select
                  name="status"
                  defaultValue="planning"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Data di uscita</span>
                <input
                  type="date"
                  name="releaseDate"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Obiettivo principale</span>
                <input
                  name="mainGoal"
                  placeholder='Es. "Raccogliere 100 fan email entro 30 giorni"'
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Note</span>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Qualsiasi cosa utile: vibe, riferimenti, decisioni già prese."
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              {error && (
                <p className="md:col-span-2 text-xs text-red-400">{error}</p>
              )}
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" variant="gradient" disabled={submitting}>
                  {submitting ? 'Creo...' : 'Crea release'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {releases.length === 0 && !showForm && (
        <Card>
          <CardContent className="space-y-3 p-8 text-center text-sm text-muted-foreground">
            <Disc3 className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p>Nessuna release ancora. La prima è quella che conta di più.</p>
            <Button variant="gradient" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Crea la prima release
            </Button>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            In corso
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Archiviate
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((r) => (
              <ReleaseCard key={r.id} release={r} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReleaseCard({ release, muted }: { release: ReleaseSummary; muted?: boolean }) {
  return (
    <Link
      href={`/releases/${release.id}`}
      className={cn(
        'group rounded-xl border border-border/60 bg-card/60 p-4 transition-all hover:border-accent/60 hover:bg-card',
        muted && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {TYPE_LABEL[release.type] ?? release.type}
          </p>
          <h3 className="mt-0.5 truncate text-lg font-semibold">{release.title}</h3>
          {release.mainGoal && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              <Target className="mr-1 inline h-3 w-3" />
              {release.mainGoal}
            </p>
          )}
        </div>
        <Badge variant="outline" className={cn('shrink-0', STATUS_TONE[release.status])}>
          {STATUS_LABEL[release.status] ?? release.status}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniMetric
          label="Milestone aperti"
          value={`${release.openMilestones}/${release.totalMilestones}`}
        />
        <MiniMetric label="Contenuti pronti" value={`${release.scheduledContent}`} />
        <MiniMetric label="Goal attivi" value={`${release.activeGoals}`} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        {release.nextMilestone ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <ListChecks className="h-3 w-3" />
            Prossimo: <span className="text-foreground">{release.nextMilestone.title}</span>
            {release.nextMilestone.dueDate && (
              <span className="ml-1 font-mono text-[10px]">
                · {new Date(release.nextMilestone.dueDate).toLocaleDateString('it-IT')}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">Nessuna milestone aperta</span>
        )}
        {release.releaseDate && (
          <span className="font-mono text-[10px] text-muted-foreground">
            <CalendarClock className="mr-1 inline h-3 w-3" />
            {new Date(release.releaseDate).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <p className="font-mono text-sm font-semibold">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}