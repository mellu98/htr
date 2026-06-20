'use client';

import { useEffect, useState, useTransition } from 'react';
import { Save, Loader2, Sparkles, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  'instagram',
  'tiktok',
  'spotify',
  'youtube',
  'apple-music',
  'soundcloud',
  'twitter',
  'website',
  'bandcamp',
] as const;
const LEVELS = ['emerging', 'growing', 'established'] as const;
const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

interface ArtistRow {
  id: string;
  artistName: string;
  musicGenre: string | null;
  currentLevel: string | null;
  mainGoal: string | null;
  targetAudience: string | null;
  nextReleaseDate: string | null;
  activePlatforms: string[] | null;
  biggestBlock: string | null;
  brandKeywords: string | null;
  referenceArtists: string | null;
  notes: string | null;
  weeklyCallDay: string | null;
  nextCallAt: string | null;
}

interface ArtistProfilePanelProps {
  initialArtists: ArtistRow[];
  initialActiveId: string | null;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function fromForm(form: any) {
  return {
    artistName: form.artistName,
    musicGenre: form.musicGenre || null,
    currentLevel: form.currentLevel || null,
    mainGoal: form.mainGoal || null,
    targetAudience: form.targetAudience || null,
    nextReleaseDate: form.nextReleaseDate || null,
    activePlatforms: form.activePlatforms,
    biggestBlock: form.biggestBlock || null,
    brandKeywords: form.brandKeywords || null,
    referenceArtists: form.referenceArtists || null,
    notes: form.notes || null,
    weeklyCallDay: form.weeklyCallDay || null,
    nextCallAt: form.nextCallAt || null,
  };
}

export function ArtistProfilePanel({
  initialArtists,
  initialActiveId,
}: ArtistProfilePanelProps) {
  const [artists, setArtists] = useState<ArtistRow[]>(initialArtists);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [editing, setEditing] = useState<ArtistRow | null>(
    initialArtists.find((a) => a.id === initialActiveId) ?? initialArtists[0] ?? null,
  );
  const [saving, startSaving] = useTransition();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (editing) return;
    if (activeId) {
      const a = artists.find((x) => x.id === activeId);
      if (a) setEditing(a);
    }
  }, [activeId, artists, editing]);

  function refresh() {
    return fetch('/api/artist-profile')
      .then((r) => r.json())
      .then((json) => {
        setArtists(json.artists ?? []);
        setActiveId(json.active?.id ?? null);
      });
  }

  function handleSelect(id: string) {
    setActiveId(id);
    fetch('/api/artist-profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, setActive: true }),
    });
    const a = artists.find((x) => x.id === id);
    if (a) setEditing({ ...a });
  }

  function handleCreateNew() {
    setCreating(true);
    setEditing({
      id: 'new',
      artistName: '',
      musicGenre: '',
      currentLevel: null,
      mainGoal: '',
      targetAudience: '',
      nextReleaseDate: null,
      activePlatforms: [],
      biggestBlock: '',
      brandKeywords: '',
      referenceArtists: '',
      notes: '',
      weeklyCallDay: null,
      nextCallAt: null,
    });
  }

  function handleSave(form: any) {
    if (!editing) return;
    const payload = fromForm(form);
    startSaving(async () => {
      if (editing.id === 'new') {
        const res = await fetch('/api/artist-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          await refresh();
          setEditing(json.artist);
          setCreating(false);
        }
      } else {
        const res = await fetch(`/api/artist-profile/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          await refresh();
          setEditing(json.artist);
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminare questo profilo artista? Verranno cancellati anche task e conversazioni collegati.')) return;
    startSaving(async () => {
      await fetch(`/api/artist-profile/${id}`, { method: 'DELETE' });
      await refresh();
      setEditing(null);
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Artist Profile</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Il profilo è la base su cui il Coach ragiona. Più è onesto, più il
            coach è utile.
          </p>
        </div>
        <Button variant="gradient" size="sm" onClick={handleCreateNew}>
          <Plus className="h-4 w-4" />
          Nuovo artista
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Artisti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {artists.length === 0 && !creating && (
              <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-center text-xs text-muted-foreground">
                Nessun artista. Premi "Nuovo artista".
              </p>
            )}
            {artists.map((a) => {
              const isActive = a.id === activeId;
              const isEditing = a.id === editing?.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelect(a.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors',
                    isEditing
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border/60 bg-background/40 hover:bg-muted/60',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.artistName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[a.musicGenre, a.currentLevel].filter(Boolean).join(' · ') || 'Profilo nuovo'}
                    </p>
                  </div>
                  {isActive && (
                    <Badge variant="cyan" className="shrink-0">
                      attivo
                    </Badge>
                  )}
                </button>
              );
            })}
            {creating && (
              <p className="rounded-md border border-dashed border-accent/40 bg-accent/5 p-3 text-center text-xs">
                Compila il form e salva per creare il nuovo profilo.
              </p>
            )}
          </CardContent>
        </Card>

        <div>
          {editing ? (
            <ArtistForm
              key={editing.id}
              initial={editing}
              saving={saving}
              onSave={handleSave}
              onDelete={
                editing.id === 'new'
                  ? undefined
                  : () => handleDelete(editing.id)
              }
            />
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Seleziona un artista o creane uno nuovo.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtistForm({
  initial,
  saving,
  onSave,
  onDelete,
}: {
  initial: ArtistRow;
  saving: boolean;
  onSave: (form: any) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    artistName: initial.artistName ?? '',
    musicGenre: initial.musicGenre ?? '',
    currentLevel: initial.currentLevel ?? '',
    mainGoal: initial.mainGoal ?? '',
    targetAudience: initial.targetAudience ?? '',
    nextReleaseDate: toDateInput(initial.nextReleaseDate),
    activePlatforms: initial.activePlatforms ?? [],
    biggestBlock: initial.biggestBlock ?? '',
    brandKeywords: initial.brandKeywords ?? '',
    referenceArtists: initial.referenceArtists ?? '',
    notes: initial.notes ?? '',
    weeklyCallDay: initial.weeklyCallDay ?? '',
    nextCallAt: toDateTimeInput(initial.nextCallAt),
  });

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function togglePlatform(p: string) {
    setForm((prev) => ({
      ...prev,
      activePlatforms: prev.activePlatforms.includes(p)
        ? prev.activePlatforms.filter((x) => x !== p)
        : [...prev.activePlatforms, p],
    }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {initial.id === 'new' ? 'Nuovo artista' : initial.artistName || 'Profilo artista'}
        </CardTitle>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-6"
        >
          <Section title="Identità">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome artista *">
                <Input
                  required
                  value={form.artistName}
                  onChange={(e) => patch({ artistName: e.target.value })}
                  placeholder="Es. Notturno"
                />
              </Field>
              <Field label="Genere musicale">
                <Input
                  value={form.musicGenre}
                  onChange={(e) => patch({ musicGenre: e.target.value })}
                  placeholder="Es. indie-pop italiano"
                />
              </Field>
              <Field label="Livello attuale">
                <ChoiceGroup
                  value={form.currentLevel}
                  options={LEVELS.map((l) => ({ value: l, label: l }))}
                  onChange={(v) => patch({ currentLevel: v })}
                />
              </Field>
              <Field label="Prossimo rilascio">
                <Input
                  type="date"
                  value={form.nextReleaseDate}
                  onChange={(e) => patch({ nextReleaseDate: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Strategia">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Obiettivo principale (main goal)">
                <Textarea
                  rows={3}
                  value={form.mainGoal}
                  onChange={(e) => patch({ mainGoal: e.target.value })}
                  placeholder="Es. consolidare 10k ascoltatori mensili entro 6 mesi"
                />
              </Field>
              <Field label="Target audience">
                <Textarea
                  rows={3}
                  value={form.targetAudience}
                  onChange={(e) => patch({ targetAudience: e.target.value })}
                  placeholder="Chi sono i tuoi ascoltatori ideali?"
                />
              </Field>
            </div>
            <Field label="Piattaforme attive">
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const active = form.activePlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      // min-h-[44px] + touch-manipulation: meets WCAG 2.5.5 / iOS HIG
                      // for tap targets. Chips need to be tappable comfortably
                      // on a phone without zooming in.
                      className={cn(
                        'inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-xs touch-manipulation transition-colors',
                        active
                          ? 'border-accent/50 bg-accent/15 text-accent'
                          : 'border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      {active ? '✓ ' : ''}{p}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Brand keywords">
                <Input
                  value={form.brandKeywords}
                  onChange={(e) => patch({ brandKeywords: e.target.value })}
                  placeholder="Es. notturno, malinconico, urbano"
                />
              </Field>
              <Field label="Reference artists">
                <Input
                  value={form.referenceArtists}
                  onChange={(e) => patch({ referenceArtists: e.target.value })}
                  placeholder="Es. Lucio Battisti, Tamino"
                />
              </Field>
            </div>
          </Section>

          <Section title="Coach mode">
            <Field label="Blocco principale (biggest block)">
              <Textarea
                rows={3}
                value={form.biggestBlock}
                onChange={(e) => patch({ biggestBlock: e.target.value })}
                placeholder="Cosa ti sta davvero fermando in questo momento?"
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Giorno della call settimanale">
                <ChoiceGroup
                  value={form.weeklyCallDay}
                  options={DAYS.map((d) => ({ value: d, label: d.slice(0, 3) }))}
                  onChange={(v) => patch({ weeklyCallDay: v })}
                />
              </Field>
              <Field label="Prossima call">
                <Input
                  type="datetime-local"
                  value={form.nextCallAt}
                  onChange={(e) => patch({ nextCallAt: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Note libere">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Tutto ciò che vuoi che il coach sappia e che non sta nelle sezioni sopra."
            />
          </Section>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            {saving && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> salvataggio…
              </span>
            )}
            <Button type="submit" variant="gradient" disabled={saving}>
              <Save className="h-4 w-4" />
              Salva profilo
            </Button>
          </div>
        </form>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              Dopo aver salvato, apri il <strong>Coach</strong>: userà questo
              profilo per personalizzare ogni risposta. Più i campi sono
              onesti, più il coach è utile.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ChoiceGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-input bg-background/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-2.5 py-1 text-xs capitalize transition-colors',
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
