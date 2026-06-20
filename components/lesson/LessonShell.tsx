'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock, Download, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocalVideoPlayer } from '@/components/video/LocalVideoPlayer';
import { LessonNavigator } from '@/components/video/LessonNavigator';
import { OverviewTab } from '@/components/lesson/OverviewTab';
import { NotesTab } from '@/components/lesson/NotesTab';
import { BookmarksTab } from '@/components/lesson/BookmarksTab';
import { ChecklistTab } from '@/components/lesson/ChecklistTab';
import { FlashcardsTab } from '@/components/lesson/FlashcardsTab';
import { QuizTab } from '@/components/lesson/QuizTab';
import { AnalysisTab } from '@/components/lesson/AnalysisTab';
import { Markdown } from '@/components/ui/markdown';
import type { Lesson, LessonRuntimeStatus, AIStatus, ReviewStatus } from '@/lib/types';
import {
  AI_STATUS_LABEL,
  AI_STATUS_VARIANT,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_VARIANT,
} from '@/lib/status';
import type { Flashcard, QuizQuestion, ChecklistItem, LessonAnalysis } from '@/lib/types';

interface LessonShellProps {
  lesson: Lesson;
  prev: Lesson | undefined;
  next: Lesson | undefined;
  status: LessonRuntimeStatus;
  groups: {
    module: { id: string; title: string; order: number };
    lessons: Lesson[];
  }[];
  statuses: Record<string, LessonRuntimeStatus | undefined>;
  initialNote: string | null;
  initialWatchedSeconds: number;
  initialPercent: number;
  content: {
    transcript: string | null;
    visualNotes: string | null;
    summary: string | null;
    actionPlan: string | null;
    checklist: ChecklistItem[] | null;
    quiz: QuizQuestion[] | null;
    flashcards: Flashcard[] | null;
    analysis: LessonAnalysis | null;
  };
}

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'visual-notes', label: 'Visual Notes' },
  { value: 'summary', label: 'Summary' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'action-plan', label: 'Action Plan' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'notes', label: 'Notes' },
  { value: 'bookmarks', label: 'Bookmarks' },
  { value: 'analysis', label: 'AI Analysis' },
];

export function LessonShell(props: LessonShellProps) {
  const { lesson, prev, next, status, groups, statuses, content, initialNote, initialWatchedSeconds, initialPercent } = props;
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);

  const handleProgress = useCallback(
    (data: { watchedSeconds: number; percent: number }) => {
      setWatchedSeconds(data.watchedSeconds);
      // Fire-and-forget — page-level handler is in /lesson/[slug]/page.tsx
      fetch(`/api/progress/lesson/${lesson.slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          watchedSeconds: data.watchedSeconds,
          videoPercent: data.percent,
        }),
      }).catch(() => {});
    },
    [lesson.slug],
  );

  const handleComplete = useCallback(() => {
    fetch(`/api/progress/lesson/${lesson.slug}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true, videoPercent: 100 }),
    }).catch(() => {});
  }, [lesson.slug]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/library" className="hover:text-accent">
              Library
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate">{lesson.moduleTitle}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {lesson.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={AI_STATUS_VARIANT[status.aiStatus as AIStatus]}>
              {AI_STATUS_LABEL[status.aiStatus as AIStatus]}
            </Badge>
            <Badge variant={REVIEW_STATUS_VARIANT[status.reviewStatus as ReviewStatus]}>
              {REVIEW_STATUS_LABEL[status.reviewStatus as ReviewStatus]}
            </Badge>
            <Badge variant="muted">{lesson.duration}</Badge>
            {!status.videoPresent && (
              <Badge variant="warning" className="gap-1">
                <Lock className="h-3 w-3" /> Video non importato
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prev && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/lesson/${prev.slug}`}>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Precedente</span>
              </Link>
            </Button>
          )}
          {next && (
            <Button asChild size="sm" variant="gradient" className="gap-1">
              <Link href={`/lesson/${next.slug}`}>
                <span className="hidden sm:inline">Successiva</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-5">
          <LocalVideoPlayer
            slug={lesson.slug}
            videoPath={lesson.videoPath}
            durationSeconds={lesson.durationSeconds}
            initialTime={initialWatchedSeconds}
            initialPercent={initialPercent}
            onProgress={handleProgress}
            onComplete={handleComplete}
          />

          <Tabs defaultValue="overview" className="w-full">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-max min-w-full">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OverviewTab
                slug={lesson.slug}
                title={lesson.title}
                aiStatus={status.aiStatus as AIStatus}
                reviewStatus={status.reviewStatus as ReviewStatus}
                summary={content.summary}
                analysisTopics={content.analysis?.mainTopics ?? []}
                practicalOutput={content.analysis?.practicalOutput ?? ''}
                applied={status.progress.applied}
              />
            </TabsContent>

            <TabsContent value="transcript">
              <ContentCard title="Transcript">
                {content.transcript ? (
                  <Markdown content={content.transcript} />
                ) : (
                  <EmptyTab
                    title="Transcript non ancora generato"
                    hint="Vai su AI Processing e lancia l'analisi per questa lezione."
                  />
                )}
              </ContentCard>
            </TabsContent>

            <TabsContent value="visual-notes">
              <ContentCard title="Visual notes">
                {content.visualNotes ? (
                  <Markdown content={content.visualNotes} />
                ) : (
                  <EmptyTab
                    title="Visual notes non ancora generate"
                    hint="Verranno generate insieme all'analisi AI."
                  />
                )}
              </ContentCard>
            </TabsContent>

            <TabsContent value="summary">
              <ContentCard title="Summary">
                {content.summary ? (
                  <Markdown content={content.summary} />
                ) : (
                  <EmptyTab
                    title="Summary non ancora generato"
                    hint="Verrà generato insieme all'analisi AI."
                  />
                )}
              </ContentCard>
            </TabsContent>

            <TabsContent value="checklist">
              <ChecklistTab slug={lesson.slug} items={content.checklist} />
            </TabsContent>

            <TabsContent value="action-plan">
              <ContentCard title="Action plan">
                {content.actionPlan ? (
                  <>
                    <Markdown content={content.actionPlan} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadText('action-plan', lesson.slug, content.actionPlan ?? '')}
                      >
                        <Download className="h-4 w-4" />
                        Esporta Markdown
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyTab
                    title="Action plan non ancora generato"
                    hint="Apri AI Processing per crearlo."
                  />
                )}
              </ContentCard>
            </TabsContent>

            <TabsContent value="quiz">
              <QuizTab slug={lesson.slug} questions={content.quiz} />
            </TabsContent>

            <TabsContent value="flashcards">
              <FlashcardsTab slug={lesson.slug} cards={content.flashcards} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesTab slug={lesson.slug} initialNote={initialNote} />
            </TabsContent>

            <TabsContent value="bookmarks">
              <BookmarksTab slug={lesson.slug} currentTime={watchedSeconds} />
            </TabsContent>

            <TabsContent value="analysis">
              <AnalysisTab analysis={content.analysis} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Navigator (right rail on desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)]">
            <LessonNavigator
              groups={groups}
              activeSlug={lesson.slug}
              statuses={statuses}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom navigator */}
      <details className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
          Navigatore lezioni
        </summary>
        <div className="max-h-[60vh] overflow-y-auto border-t border-border/60">
          <LessonNavigator
            groups={groups}
            activeSlug={lesson.slug}
            statuses={statuses}
          />
        </div>
      </details>
    </div>
  );
}

function ContentCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-base font-semibold tracking-tight">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyTab({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href="/ai">
            <Share2 className="h-4 w-4" /> Vai ad AI Processing
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function downloadText(prefix: string, slug: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-${prefix}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
