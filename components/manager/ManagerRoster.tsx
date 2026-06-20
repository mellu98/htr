'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ManagerArtistRow {
  id: string;
  nickname: string | null;
  status: string;
  courseProgressPercent: number;
  openTasksCount: number;
  blockedTasksCount: number;
  lastBlock: string | null;
  nextAction: string | null;
  nextCallAt: string | null;
  artistProfile: {
    id: string;
    artistName: string;
    musicGenre: string | null;
    currentLevel: string | null;
    biggestBlock: string | null;
  };
}

interface AvailableArtist {
  id: string;
  artistName: string;
  musicGenre: string | null;
  currentLevel: string | null;
}

interface ManagerRosterProps {
  initialCards: ManagerArtistRow[];
  availableArtists: AvailableArtist[];
}

export function ManagerRoster({ initialCards, availableArtists }: ManagerRosterProps) {
  const [cards, setCards] = useState<ManagerArtistRow[]>(initialCards);
  const [available, setAvailable] = useState<AvailableArtist[]>(availableArtists);
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const [r1, r2] = await Promise.all([
      fetch('/api/manager').then((r) => r.json()),
      fetch('/api/artist-profile').then((r) => r.json()),
    ]);
    setCards(r1.cards ?? []);
    const linked = new Set((r1.cards ?? []).map((c: any) => c.artistProfile.id));
    setAvailable(
      (r2.artists ?? []).filter((a: AvailableArtist) => !linked.has(a.id)),
    );
  }

  async function handleAttach(artistId: string) {
    startTransition(async () => {
      await fetch('/api/manager/attach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artistProfileId: artistId }),
      });
      await refresh();
    });
  }

  async function handleSetActive(artistId: string) {
    startTransition(async () => {
      await fetch('/api/artist-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: artistId, setActive: true }),
      });
    });
  }

  async function handleDetach(id: string) {
    if (!confirm('Rimuovere questo artista dal manager roster?')) return;
    startTransition(async () => {
      await fetch(`/api/manager/${id}`, { method: 'DELETE' });
      await refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Manager Mode</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Roster demo: gestisci più artisti, vedi blocchi, task e prossima
            azione per ciascuno.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/artist-profile">
            <Plus className="h-4 w-4" />
            Aggiungi artista
          </Link>
        </Button>
      </header>

      {available.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Artisti disponibili da aggiungere al roster
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {available.length} profili non ancora collegati.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {available.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.artistName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {[a.musicGenre, a.currentLevel].filter(Boolean).join(' · ') || 'Profilo'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAttach(a.id)}
                  disabled={pending}
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Aggiungi
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Roster vuoto.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Crea prima un artista dalla pagina Artist Profile, poi aggiungilo al roster.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/artist-profile">Vai a Artist Profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <ManagerCard
              key={card.id}
              card={card}
              onActivate={() => handleSetActive(card.artistProfile.id)}
              onDetach={() => handleDetach(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ManagerCard({
  card,
  onActivate,
  onDetach,
}: {
  card: ManagerArtistRow;
  onActivate: () => void;
  onDetach: () => void;
}) {
  const nextCall = card.nextCallAt ? new Date(card.nextCallAt) : null;
  const status =
    card.blockedTasksCount > 0
      ? 'blocked'
      : card.openTasksCount > 0
        ? 'active'
        : 'idle';
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'h-1',
          status === 'blocked'
            ? 'bg-amber-500'
            : status === 'active'
              ? 'bg-gradient-brand'
              : 'bg-muted',
        )}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {card.nickname ?? card.artistProfile.artistName}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {[card.artistProfile.musicGenre, card.artistProfile.currentLevel]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <Badge
            variant={status === 'blocked' ? 'warning' : status === 'active' ? 'cyan' : 'muted'}
          >
            {status === 'blocked' ? 'Bloccato' : status === 'active' ? 'Attivo' : 'Idle'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Corso</span>
            <span className="font-mono">{card.courseProgressPercent}%</span>
          </div>
          <Progress
            value={card.courseProgressPercent}
            className="h-1.5"
            indicatorClassName="bg-gradient-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Stat label="Task aperti" value={card.openTasksCount} icon={CircleDashed} />
          <Stat label="Bloccati" value={card.blockedTasksCount} icon={Sparkles} />
        </div>

        {card.lastBlock && (
          <div className="rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ultimo blocco
            </span>
            <p className="mt-0.5 line-clamp-2 text-foreground/90">{card.lastBlock}</p>
          </div>
        )}

        {card.nextAction && (
          <div className="rounded-md border border-accent/20 bg-accent/5 p-2.5 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-accent">
              Prossima azione
            </span>
            <p className="mt-0.5 line-clamp-2 text-foreground/90">{card.nextAction}</p>
          </div>
        )}

        {nextCall && (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Prossima call: <strong>{nextCall.toLocaleString()}</strong></span>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/tasks`}>Apri task</Link>
          </Button>
          <Button asChild size="sm" variant="gradient" className="flex-1">
            <Link href={`/coach`}>
              <Sparkles className="h-3.5 w-3.5" />
              Coach
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onActivate}
            title="Imposta come artista attivo"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDetach}
            title="Rimuovi dal roster"
            className="text-rose-300 hover:bg-rose-500/10"
          >
            ×
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 font-mono text-base">{value}</div>
    </div>
  );
}
