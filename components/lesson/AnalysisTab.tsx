import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import type { LessonAnalysis } from '@/lib/types';

interface AnalysisTabProps {
  analysis: LessonAnalysis | null;
}

const DIFFICULTY_VARIANT: Record<
  LessonAnalysis['difficulty'],
  'success' | 'cyan' | 'warning'
> = {
  beginner: 'success',
  intermediate: 'cyan',
  advanced: 'warning',
};

export function AnalysisTab({ analysis }: AnalysisTabProps) {
  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="font-medium">Analisi AI non ancora disponibile</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Apri la pagina AI Processing e lancia l'analisi per questa lezione.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Livello difficoltà</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={DIFFICULTY_VARIANT[analysis.difficulty]}>
              {analysis.difficulty}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Output pratico consigliato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">
              {analysis.practicalOutput}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concetti principali</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 md:grid-cols-2">
            {analysis.mainTopics.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-sm"
              >
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-brand" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elementi visivi rilevanti</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.visualElements.map((el, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-sm"
                >
                  <Badge variant="muted" className="capitalize">{el.type}</Badge>
                  <span className="flex-1 text-foreground/90">{el.description}</span>
                  {el.at && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {el.at}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Momenti importanti</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.importantMoments.map((m, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border/60 bg-background/40 p-2.5 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.title}</span>
                    <span className="font-mono text-xs text-accent">{m.timestamp}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.why}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggerimenti di studio</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown content={analysis.recommendedNextAction} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown content={analysis.managerNotes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
