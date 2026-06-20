'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';

interface ActiveArtist {
  id: string;
  artistName: string;
  nextCallAt: string | null;
}

interface CallPrepReportRow {
  id: string;
  callDate: string | null;
  completedSince: string;
  openTasks: string;
  blocks: string;
  questions: string;
  decisions: string;
  nextWeekPlan: string;
  fullMarkdown: string;
  createdAt: string;
}

interface CallPrepPanelProps {
  activeArtist: ActiveArtist | null;
  initialReports: CallPrepReportRow[];
}

export function CallPrepPanel({ activeArtist, initialReports }: CallPrepPanelProps) {
  const [reports, setReports] = useState<CallPrepReportRow[]>(initialReports);
  const [preview, setPreview] = useState<CallPrepReportRow | null>(
    initialReports[0] ?? null,
  );
  const [pending, startTransition] = useTransition();

  async function generate() {
    if (!activeArtist) return;
    startTransition(async () => {
      const res = await fetch('/api/call-prep/generate', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        const fresh: CallPrepReportRow = {
          ...json.report,
          createdAt: json.report.createdAt,
        };
        setReports((prev) => [fresh, ...prev]);
        setPreview(fresh);
      } else {
        alert(json.error ?? 'Errore nella generazione');
      }
    });
  }

  if (!activeArtist) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="font-medium">Nessun artista attivo.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Crea prima un profilo artista per generare un report di call prep.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/artist-profile">Vai a Artist Profile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Call Prep</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Report automatico pre-call basato sui tuoi task, profilo e
            progresso corso. Portalo in call e risparmia 10 minuti di "allora,
            dove eravamo".
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeArtist.nextCallAt && (
            <Badge variant="violet">
              Prossima call: {new Date(activeArtist.nextCallAt).toLocaleString('it-IT')}
            </Badge>
          )}
          <Button variant="gradient" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera report
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report recenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.length === 0 && (
              <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-center text-xs text-muted-foreground">
                Nessun report ancora. Premi "Genera report".
              </p>
            )}
            {reports.map((r) => {
              const isActive = preview?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPreview(r)}
                  className={
                    'w-full rounded-lg border px-3 py-2 text-left transition-colors ' +
                    (isActive
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border/60 bg-background/40 hover:bg-muted/60')
                  }
                >
                  <p className="flex items-center justify-between text-sm font-medium">
                    <span>Report</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleTimeString('it-IT', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div>
          {preview ? (
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-brand" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Call Prep Report
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadText(`call-prep-${preview.id}`, preview.fullMarkdown)}
                >
                  <Download className="h-4 w-4" />
                  Esporta Markdown
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                <Section title="Cosa è stato completato" body={preview.completedSince} />
                <Section title="Task ancora aperti" body={preview.openTasks} />
                <Section title="Blocchi principali" body={preview.blocks} />
                <Section title="Domande per il coach" body={preview.questions} />
                <Section title="Decisioni da prendere" body={preview.decisions} />
                <Section title="Piano prossima settimana" body={preview.nextWeekPlan} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Genera il primo report o selezionane uno a sinistra.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="rounded-md border border-border/60 bg-background/40 p-4">
        <Markdown content={body} />
      </div>
    </div>
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
