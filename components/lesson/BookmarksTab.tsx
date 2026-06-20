'use client';

import { useEffect, useState } from 'react';
import { BookmarkPlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Bookmark {
  id: string;
  title: string;
  note: string | null;
  videoTime: number | null;
  createdAt: string;
}

interface BookmarksTabProps {
  slug: string;
  currentTime: number;
}

export function BookmarksTab({ slug, currentTime }: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookmarks/${slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBookmarks(json.bookmarks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/bookmarks/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || undefined,
          videoTime: useCurrentTime ? Math.floor(currentTime) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTitle('');
      setNote('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo segnalibro?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/bookmarks/delete/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuovo segnalibro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo (es. 'definizione operativa di posizionamento')"
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota opzionale…"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useCurrentTime}
                onChange={(e) => setUseCurrentTime(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background accent-accent"
              />
              Collega al minuto corrente ({formatTime(currentTime)})
            </label>
            <Button size="sm" onClick={handleCreate} disabled={!title.trim()} className="ml-auto">
              <BookmarkPlus className="h-4 w-4" />
              Salva segnalibro
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Segnalibri salvati</CardTitle>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="space-y-2">
          {bookmarks.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
              Nessun segnalibro per questa lezione.
            </p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="group flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      {typeof b.videoTime === 'number' && (
                        <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                          {formatTime(b.videoTime)}
                        </span>
                      )}
                    </div>
                    {b.note && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        {b.note}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {new Date(b.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(b.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Elimina segnalibro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}
