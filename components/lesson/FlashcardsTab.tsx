'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Flashcard } from '@/lib/types';

interface FlashcardsTabProps {
  slug: string;
  cards: Flashcard[] | null;
}

export function FlashcardsTab({ slug, cards }: FlashcardsTabProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, 'known' | 'review' | 'unknown'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flashcards/${slug}/list`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const map: Record<string, 'known' | 'review' | 'unknown'> = {};
            for (const p of json.progress ?? []) map[p.cardId] = p.status;
            setStatusMap(map);
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
  }, [slug]);

  if (!cards || cards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="font-medium">Flashcard non ancora generate</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Apri la pagina AI Processing e lancia l'analisi per questa lezione.
          </p>
        </CardContent>
      </Card>
    );
  }
  const list = cards;

  const card = list[index];
  const known = list.filter((c) => statusMap[c.id] === 'known').length;
  const review = list.filter((c) => statusMap[c.id] === 'review').length;
  const unknown = list.filter((c) => statusMap[c.id] === 'unknown').length;

  async function setStatus(status: 'known' | 'review' | 'unknown') {
    if (!card) return;
    setStatusMap((prev) => ({ ...prev, [card.id]: status }));
    try {
      await fetch(`/api/flashcards/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, status }),
      });
    } catch {
      /* ignore — UI already updated optimistically */
    }
  }

  function next() {
    setFlipped(false);
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }

  function prev() {
    setFlipped(false);
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Flashcards</CardTitle>
            <span className="text-xs text-muted-foreground">
              {index + 1} / {list.length}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-400">✓ {known} so</span>
            <span className="text-amber-400">↻ {review} da ripassare</span>
            <span className="text-muted-foreground">· {unknown} da studiare</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFlipped((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') setFlipped((v) => !v);
              }}
              className="group relative h-56 cursor-pointer select-none [perspective:1000px]"
            >
              <div
                className={cn(
                  'relative h-full w-full rounded-xl border border-border/60 transition-transform duration-500 [transform-style:preserve-3d]',
                  flipped && '[transform:rotateY(180deg)]',
                )}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-card to-background p-6 text-center [backface-visibility:hidden]">
                  <span className="text-[10px] uppercase tracking-widest text-accent">
                    Domanda
                  </span>
                  <p className="text-xl font-semibold">{card.front}</p>
                  <p className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Clicca per girare
                  </p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-violet-950/60 via-card to-cyan-950/60 p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="text-[10px] uppercase tracking-widest text-accent">
                    Risposta
                  </span>
                  <p className="text-base leading-snug">{card.back}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" onClick={prev} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus('unknown')}
                className="border-border hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus('review')}
                className="border-amber-400/40 text-amber-300 hover:bg-amber-500/10"
              >
                <X className="h-4 w-4" />
                Da ripassare
              </Button>
              <Button
                size="sm"
                onClick={() => setStatus('known')}
                className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              >
                <Check className="h-4 w-4" />
                La so
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={next} disabled={index === list.length - 1}>
              Successiva
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
