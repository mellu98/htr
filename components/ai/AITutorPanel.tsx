'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/lib/types';
import { TUTOR_PROMPTS, type TutorPromptId } from '@/lib/ai/tutor-prompts';

interface AITutorPanelProps {
  lessons: Lesson[];
}

export function AITutorPanel({ lessons }: AITutorPanelProps) {
  const [slug, setSlug] = useState<string>(lessons[0]?.slug ?? '');
  const lesson = lessons.find((l) => l.slug === slug);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">AI Tutor</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tutor intelligente che legge i contenuti generati localmente. Nessuna
          chiamata live: le risposte sono costruite a partire da summary,
          checklist, quiz, flashcards e lesson-analysis.json.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_2fr] md:items-center">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Lezione
          </label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm focus-ring"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.slug}>
                {l.title}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {lesson ? (
        <TutorForLesson lesson={lesson} />
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Seleziona una lezione per iniziare.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TutorForLesson({ lesson }: { lesson: Lesson }) {
  const [activeId, setActiveId] = useState<TutorPromptId>('summarize');
  const [response, setResponse] = useState<{
    promptId: TutorPromptId;
    title: string;
    body: string;
    sourcesUsed: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAsk(id: TutorPromptId) {
    setActiveId(id);
    startTransition(async () => {
      try {
        const res = await fetch('/api/tutor', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: lesson.slug, promptId: id }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setResponse(json.result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore';
        setResponse({
          promptId: id,
          title: 'Errore del tutor',
          body: `Non sono riuscito a generare la risposta: ${message}`,
          sourcesUsed: [],
        });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" /> Prompt
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Scegli un prompt: il tutor compone una risposta dai file generati.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {TUTOR_PROMPTS.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAsk(p.id)}
                className={cn(
                  'group w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-border/60 bg-background/40 hover:bg-muted/60',
                )}
              >
                <p className="text-sm font-medium">{p.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.description}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-brand" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" />
            {response?.title ?? 'Seleziona un prompt'}
          </CardTitle>
          {response && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Fonti:</span>
              {response.sourcesUsed.length === 0 ? (
                <Badge variant="warning">Nessun contenuto generato</Badge>
              ) : (
                response.sourcesUsed.map((s) => (
                  <Badge key={s} variant="muted">
                    {s}
                  </Badge>
                ))
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Composizione risposta dai file locali…
            </div>
          ) : response ? (
            <Markdown content={response.body} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Premi uno dei prompt a sinistra per generare una risposta basata
              sui contenuti della lezione.
            </p>
          )}
          {response && (
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const blob = new Blob([response.body], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${lesson.slug}-${response.promptId}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Esporta Markdown
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
