'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  deadline: string | null;
  status: string;
  releaseId: string | null;
  artistProfileId: string;
}

const STATUSES = ['active', 'achieved', 'missed', 'archived'];

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo',
  achieved: 'Raggiunto',
  missed: 'Perso',
  archived: 'Archiviato',
};

const STATUS_TONE: Record<string, string> = {
  active: 'border-cyan-400/40 text-cyan-300',
  achieved: 'border-emerald-400/40 text-emerald-300',
  missed: 'border-red-400/40 text-red-300',
  archived: 'border-border text-muted-foreground',
};

export function GoalsPanel({
  activeArtist,
  goals,
}: {
  activeArtist: { id: string; artistName: string } | null;
  goals: Goal[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  if (!activeArtist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessun artista attivo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Crea prima il profilo artista.
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData) {
    const payload = {
      artistProfileId: activeArtist!.id,
      title: String(formData.get('title') ?? '').trim(),
      metric: String(formData.get('metric') ?? 'unità').trim(),
      targetValue: Number(formData.get('targetValue') ?? 0),
      currentValue: Number(formData.get('currentValue') ?? 0),
      deadline: formData.get('deadline') || null,
      status: 'active',
    };
    if (!payload.title || !payload.targetValue) return;
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    router.refresh();
  }

  async function bump(id: string, currentValue: number) {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentValue }),
    });
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status !== 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Obiettivi del mese
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Numeri misurabili con scadenza. Cosa stai puntando a raggiungere.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nuovo obiettivo
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuovo obiettivo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(new FormData(e.currentTarget));
              }}
              className="grid gap-3 md:grid-cols-2"
            >
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Titolo *</span>
                <input
                  name="title"
                  required
                  placeholder='Es. "Raccogliere 100 fan email entro 30 giorni"'
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Metrica</span>
                <input
                  name="metric"
                  defaultValue="unità"
                  placeholder="emails, streams, follower"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Target *</span>
                <input
                  type="number"
                  name="targetValue"
                  required
                  min="1"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Valore attuale</span>
                <input
                  type="number"
                  name="currentValue"
                  defaultValue={0}
                  min="0"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Scadenza</span>
                <input
                  type="date"
                  name="deadline"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Annulla
                </Button>
                <Button type="submit" variant="gradient">
                  Salva
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attivi
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onBump={bump} onStatus={setStatus} onRemove={remove} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Chiusi
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} onBump={bump} onStatus={setStatus} onRemove={remove} muted />
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nessun obiettivo. Senza numeri, "crescere" è una parola vuota.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onBump,
  onStatus,
  onRemove,
  muted,
}: {
  goal: Goal;
  onBump: (id: string, currentValue: number) => void;
  onStatus: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  muted?: boolean;
}) {
  const pct = goal.targetValue > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : 0;
  return (
    <Card className={cn(muted && 'opacity-70')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold">{goal.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {goal.currentValue} / {goal.targetValue} {goal.metric}
              {goal.deadline && (
                <> · entro {new Date(goal.deadline).toLocaleDateString('it-IT')}</>
              )}
            </p>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px]', STATUS_TONE[goal.status])}>
            {STATUS_LABEL[goal.status] ?? goal.status}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full bg-gradient-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-right font-mono text-xs text-muted-foreground">{pct}%</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onBump(goal.id, Math.max(0, goal.currentValue - 1))}
              className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-xs hover:bg-muted/60"
            >
              −
            </button>
            <input
              type="number"
              defaultValue={goal.currentValue}
              onBlur={(e) => {
                const v = Number(e.currentTarget.value);
                if (v !== goal.currentValue) onBump(goal.id, v);
              }}
              className="w-16 rounded-md border border-border bg-background/60 px-2 py-0.5 text-center font-mono text-xs"
            />
            <button
              onClick={() => onBump(goal.id, goal.currentValue + 1)}
              className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-xs hover:bg-muted/60"
            >
              +
            </button>
          </div>
          <select
            value={goal.status}
            onChange={(e) => onStatus(goal.id, e.target.value)}
            className="rounded-md border border-border bg-background/60 px-1 py-0.5 text-[10px]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => onRemove(goal.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  );
}