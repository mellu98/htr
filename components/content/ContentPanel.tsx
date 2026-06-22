'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Idea {
  id: string;
  title: string;
  platform: string;
  format: string;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  script: string | null;
  status: string;
  publishAt: string | null;
  publishedAt: string | null;
  releaseId: string | null;
  artistProfileId: string;
}

const STATUSES = ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived'] as const;
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'spotify', 'newsletter', 'website', 'other'] as const;
const FORMATS = ['reel', 'tiktok', 'carousel', 'story', 'short', 'post', 'email', 'live', 'other'] as const;

const STATUS_LABEL: Record<string, string> = {
  idea: 'Idea',
  draft: 'Bozza',
  approved: 'Approvato',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

export function ContentPanel({
  activeArtist,
  ideas,
}: {
  activeArtist: { id: string; artistName: string } | null;
  ideas: Idea[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = useMemo(
    () =>
      ideas.filter(
        (i) =>
          (!filterPlatform || i.platform === filterPlatform) &&
          (!filterStatus || i.status === filterStatus),
      ),
    [ideas, filterPlatform, filterStatus],
  );

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
      format: String(formData.get('format') ?? 'post'),
      title: String(formData.get('title') ?? '').trim(),
      hook: formData.get('hook') || null,
      caption: formData.get('caption') || null,
      cta: formData.get('cta') || null,
      script: formData.get('script') || null,
      publishAt: formData.get('publishAt') || null,
      status: 'idea',
    };
    if (!payload.title) return;
    await fetch('/api/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/content-ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/content-ideas/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Cosa pubblichiamo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendario contenuti: idee, bozze, programmati.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nuova idea
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
        >
          <option value="">Tutte le piattaforme</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs"
        >
          <option value="">Tutti gli stati</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuova idea contenuto</CardTitle>
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
                  placeholder='Es. "Reel storytelling sul ritornello"'
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
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
                <span className="font-medium">Formato</span>
                <select
                  name="format"
                  defaultValue="reel"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Hook (prima riga che aggancia)</span>
                <input
                  name="hook"
                  placeholder="Es. Sapevi che il ritornello l'ho scritto in 3 minuti?"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">CTA</span>
                <input
                  name="cta"
                  placeholder="Es. Segui per la parte 2"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs md:col-span-2">
                <span className="font-medium">Caption / Script</span>
                <textarea
                  name="caption"
                  rows={3}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium">Data di pubblicazione (opzionale)</span>
                <input
                  type="datetime-local"
                  name="publishAt"
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" variant="gradient">
                  Salva idea
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {ideas.length === 0
              ? 'Nessun contenuto ancora. Parti con la prima idea.'
              : 'Nessun contenuto corrisponde ai filtri.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <Card key={idea.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {idea.platform} · {idea.format}
                    </p>
                    <h3 className="truncate font-semibold">{idea.title}</h3>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {STATUS_LABEL[idea.status] ?? idea.status}
                  </Badge>
                </div>
                {idea.hook && (
                  <p className="rounded-md border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground">
                    <strong>Hook:</strong> {idea.hook}
                  </p>
                )}
                {idea.caption && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{idea.caption}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <select
                    value={idea.status}
                    onChange={(e) => setStatus(idea.id, e.target.value)}
                    className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-[11px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  {idea.publishAt && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(idea.publishAt).toLocaleDateString('it-IT')}
                    </span>
                  )}
                  <button
                    onClick={() => remove(idea.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}