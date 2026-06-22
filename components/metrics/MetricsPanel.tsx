'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Snapshot {
  id: string;
  platform: string;
  date: string;
  followers: number | null;
  views: number | null;
  streams: number | null;
  linkClicks: number | null;
  monthlyListeners: number | null;
  notes: string | null;
  artistProfileId: string;
}

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'spotify', 'newsletter', 'website', 'other'];

export function MetricsPanel({
  activeArtist,
  snapshots,
  comparisons,
}: {
  activeArtist: { id: string; artistName: string } | null;
  snapshots: Snapshot[];
  comparisons: Record<string, { latest: any; previous: any }>;
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
      platform: String(formData.get('platform') ?? 'instagram'),
      date: formData.get('date') || new Date().toISOString(),
      followers: formData.get('followers'),
      views: formData.get('views'),
      streams: formData.get('streams'),
      linkClicks: formData.get('linkClicks'),
      monthlyListeners: formData.get('monthlyListeners'),
      notes: formData.get('notes') || null,
    };
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/metrics/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const platforms = Object.keys(comparisons);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Numeri da controllare
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snapshot manuali. Cosa sta crescendo, cosa è fermo.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nuovo snapshot
        </Button>
      </header>

      {platforms.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {platforms.map((plat) => {
            const c = comparisons[plat];
            return (
              <Card key={plat}>
                <CardHeader>
                  <CardTitle className="text-sm">{plat}</CardTitle>
                  <p className="text-[10px] text-muted-foreground">
                    ultimo {new Date(c.latest.date).toLocaleDateString('it-IT')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DeltaRow
                    label="Follower"
                    current={c.latest.followers}
                    previous={c.previous?.followers ?? null}
                  />
                  <DeltaRow
                    label="Stream"
                    current={c.latest.streams}
                    previous={c.previous?.streams ?? null}
                  />
                  <DeltaRow
                    label="Views"
                    current={c.latest.views}
                    previous={c.previous?.views ?? null}
                  />
                  <DeltaRow
                    label="Link clicks"
                    current={c.latest.linkClicks}
                    previous={c.previous?.linkClicks ?? null}
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuovo snapshot</CardTitle>
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
                <span className="font-medium">Piattaforma</span>
                <select
                  name="platform"
                  defaultValue="instagram"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Data</span>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <NumberField name="followers" label="Follower" />
              <NumberField name="views" label="Views" />
              <NumberField name="streams" label="Stream" />
              <NumberField name="linkClicks" label="Link clicks" />
              <NumberField name="monthlyListeners" label="Monthly listeners" />
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Note</span>
                <textarea
                  name="notes"
                  rows={2}
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Storico snapshot
        </h2>
        {snapshots.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nessuno snapshot ancora. Inseriscine uno per iniziare.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Piattaforma</th>
                    <th className="px-3 py-2 text-right">Follower</th>
                    <th className="px-3 py-2 text-right">Stream</th>
                    <th className="px-3 py-2 text-right">Views</th>
                    <th className="px-3 py-2 text-right">Clicks</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 30).map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">
                        {new Date(s.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-3 py-2">{s.platform}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.followers ?? '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.streams ?? '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.views ?? '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.linkClicks ?? '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => remove(s.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function NumberField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        name={name}
        min="0"
        className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
      />
    </label>
  );
}

function DeltaRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: number | null;
  previous: number | null;
}) {
  const delta = current != null && previous != null ? current - previous : null;
  const positive = delta != null && delta >= 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{current ?? '-'}</span>
        {delta != null && (
          <span
            className={
              positive
                ? 'flex items-center text-xs text-emerald-400'
                : 'flex items-center text-xs text-red-400'
            }
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}