'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { AI_STATUS_LABEL, AI_STATUS_VARIANT } from '@/lib/status';
import type { AIStatus, LessonRuntimeStatus, ReviewStatus } from '@/lib/types';
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_VARIANT } from '@/lib/status';

interface OverviewTabProps {
  slug: string;
  title: string;
  aiStatus: AIStatus;
  reviewStatus: ReviewStatus;
  summary: string | null;
  analysisTopics: string[];
  practicalOutput: string;
  applied: boolean;
}

export function OverviewTab({
  slug,
  title,
  aiStatus,
  reviewStatus,
  summary,
  analysisTopics,
  practicalOutput,
  applied,
}: OverviewTabProps) {
  const [marking, setMarking] = useState(false);
  const [optimisticApplied, setOptimisticApplied] = useState(applied);

  async function toggleApplied() {
    const next = !optimisticApplied;
    setOptimisticApplied(next);
    setMarking(true);
    try {
      await fetch(`/api/progress/lesson/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ applied: next }),
      });
    } catch {
      setOptimisticApplied(!next);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={AI_STATUS_VARIANT[aiStatus]}>
          {AI_STATUS_LABEL[aiStatus]}
        </Badge>
        <Badge variant={REVIEW_STATUS_VARIANT[reviewStatus]}>
          Review · {REVIEW_STATUS_LABEL[reviewStatus]}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">slug: {slug}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riassunto breve</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <Markdown content={summary} />
          ) : (
            <EmptyText
              title="Riassunto non ancora generato"
              hint="Apri AI Processing per generarlo."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concetti chiave</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisTopics.length > 0 ? (
              <ul className="space-y-1.5">
                {analysisTopics.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText title="—" hint="Genera l'analisi AI per estrarre i concetti chiave." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output pratico</CardTitle>
          </CardHeader>
          <CardContent>
            {practicalOutput ? (
              <p className="text-sm leading-relaxed text-foreground/90">{practicalOutput}</p>
            ) : (
              <EmptyText title="—" hint="Genera l'analisi AI per ottenere un output pratico concreto." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-brand" />
        <CardContent className="flex flex-col items-start gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {optimisticApplied
                ? 'Hai segnato questa lezione come applicata.'
                : 'Segna come applicata quando hai messo in pratica i concetti.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tiene traccia nella dashboard e sblocca la sezione "Progress applicazione".
            </p>
          </div>
          <Button
            onClick={toggleApplied}
            disabled={marking}
            variant={optimisticApplied ? 'outline' : 'gradient'}
            className="gap-2"
          >
            {optimisticApplied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Applicata
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Segna come applicata
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link rapidi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/review">Vai al Review Center <ExternalLink className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/ai">AI Processing <ExternalLink className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyText({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-background/40 p-4 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
