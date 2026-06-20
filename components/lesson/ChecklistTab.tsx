'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import type { ChecklistItem } from '@/lib/types';

interface ChecklistTabProps {
  slug: string;
  items: ChecklistItem[] | null;
}

export function ChecklistTab({ slug, items }: ChecklistTabProps) {
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // The endpoint per-checklist item isn't paginated; we get all progress
        // via a single endpoint that we add here as a utility call:
        const res = await fetch(`/api/checklist/${slug}/list`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const map: Record<string, boolean> = {};
            for (const p of json.progress ?? []) map[p.itemId] = p.completed;
            setProgressMap(map);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, items]);

  if (!items) {
    return (
      <EmptyState
        title="Checklist non ancora generata"
        description="Apri la pagina AI Processing e lancia l'analisi per questa lezione."
      />
    );
  }

  const completed = items.filter((it) => progressMap[it.id]).length;
  const pct = Math.round((completed / items.length) * 100);

  async function toggle(itemId: string, completed: boolean) {
    setProgressMap((prev) => ({ ...prev, [itemId]: completed }));
    try {
      await fetch(`/api/checklist/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId, completed }),
      });
    } catch {
      setProgressMap((prev) => ({ ...prev, [itemId]: !completed }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Checklist operativa</CardTitle>
          <span className="font-mono text-sm gradient-text">{completed}/{items.length}</span>
        </div>
        <Progress value={pct} className="h-1.5" indicatorClassName="bg-gradient-brand" />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const checked = !!progressMap[item.id];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    id={item.id}
                    checked={checked}
                    onCheckedChange={(v) => toggle(item.id, v === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={item.id}
                      className={
                        'block text-sm font-medium leading-tight ' +
                        (checked ? 'text-muted-foreground line-through' : '')
                      }
                    >
                      {item.title}
                    </label>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
