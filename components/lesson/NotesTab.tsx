'use client';

import { useEffect, useRef, useState } from 'react';
import { Clipboard, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NotesTabProps {
  slug: string;
  initialNote: string | null;
}

export function NotesTab({ slug, initialNote }: NotesTabProps) {
  const [body, setBody] = useState(initialNote ?? '');
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave with 800ms debounce.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (body === (initialNote ?? '')) return;
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/notes/${slug}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setLastSavedAt(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore di salvataggio');
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [body, slug, initialNote]);

  async function handleManualSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/${slug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di salvataggio');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* ignore */
    }
  }

  function handleClear() {
    if (!confirm('Svuotare le note di questa lezione?')) return;
    setBody('');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Note personali</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              salvataggio…
            </span>
          )}
          {!saving && lastSavedAt && (
            <span>Salvato · {lastSavedAt.toLocaleTimeString()}</span>
          )}
          {error && <span className="text-destructive">Errore: {error}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrivi i tuoi appunti, esempi, idee di applicazione…"
          rows={12}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleManualSave} disabled={saving}>
            <Save className="h-4 w-4" />
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={!body}>
            <Clipboard className="h-4 w-4" />
            Copia
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} disabled={!body}>
            <Trash2 className="h-4 w-4" />
            Svuota
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Autosave attivo · 800ms debounce
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
