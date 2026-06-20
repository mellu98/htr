'use client';

import Link from 'next/link';
import { Download, FileDown, NotebookPen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';

export interface NoteRow {
  id: string;
  slug: string;
  title: string;
  moduleTitle: string;
  body: string;
  updatedAt: string;
  actionPlan?: string;
  checklist?: { id: string; title: string }[];
}

interface AllNotesViewProps {
  notes: NoteRow[];
  courseTitle: string;
  totalLessons: number;
}

export function AllNotesView({ notes, courseTitle, totalLessons }: AllNotesViewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Tutte le note</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.length} note personali · {totalLessons} lezioni totali · {courseTitle}
          </p>
        </div>
        <ExportAllButton notes={notes} courseTitle={courseTitle} totalLessons={totalLessons} />
      </header>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Nessuna nota ancora scritta.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Apri una lezione e usa la tab "Notes" per iniziare. L'autosave è
              attivo.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/library">Vai alla libreria</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {notes.map((n) => (
            <li key={n.id}>
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-brand" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {n.moduleTitle}
                      </p>
                      <CardTitle className="mt-0.5 text-base">{n.title}</CardTitle>
                    </div>
                    <Badge variant="muted" className="font-mono">
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-3 text-sm">
                    {n.body.trim() ? (
                      <Markdown content={n.body} />
                    ) : (
                      <span className="text-xs italic text-muted-foreground">
                        Nota vuota.
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/lesson/${n.slug}`}>Apri lezione</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadText(`${n.slug}-note`, n.body)}
                    >
                      <Download className="h-4 w-4" />
                      Esporta Markdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExportAllButton({
  notes,
  courseTitle,
  totalLessons,
}: {
  notes: NoteRow[];
  courseTitle: string;
  totalLessons: number;
}) {
  const fullReport = buildFullReport(notes, courseTitle, totalLessons);
  return (
    <Button
      variant="gradient"
      onClick={() => downloadText('htr-full-report', fullReport)}
    >
      <FileDown className="h-4 w-4" />
      Export full course report
    </Button>
  );
}

function buildFullReport(
  notes: NoteRow[],
  courseTitle: string,
  totalLessons: number,
): string {
  const out: string[] = [];
  out.push(`# ${courseTitle} — Full Course Report`);
  out.push(``);
  out.push(`Generated: ${new Date().toISOString()}`);
  out.push(`Course: ${courseTitle} (${totalLessons} lezioni)`);
  out.push(`Notes: ${notes.length}`);
  out.push(``);

  for (const note of notes) {
    out.push(`## ${note.title}`);
    out.push(`Slug: ${note.slug} · ${note.moduleTitle}`);
    out.push(``);
    if (note.body) {
      out.push(`### Note personali`);
      out.push(note.body);
      out.push(``);
    }
    if (note.actionPlan) {
      out.push(`### Action plan`);
      out.push(note.actionPlan);
      out.push(``);
    }
    if (note.checklist && note.checklist.length) {
      out.push(`### Checklist`);
      for (const c of note.checklist) out.push(`- [ ] ${c.title}`);
      out.push(``);
    }
  }

  return out.join('\n');
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
