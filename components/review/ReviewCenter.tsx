'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ListChecks,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AI_STATUS_LABEL,
  AI_STATUS_VARIANT,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_VARIANT,
  type CourseStatusSummary,
} from '@/lib/status';
import type {
  AIStatus,
  LessonRuntimeStatus,
  ReviewStatus,
} from '@/lib/types';
import { cn } from '@/lib/utils';

type Bucket =
  | 'no-ai'
  | 'pending'
  | 'errors'
  | 'approved'
  | 'all';

interface ReviewCenterProps {
  items: {
    lessonSlug: string;
    title: string;
    moduleTitle: string;
    status: LessonRuntimeStatus;
  }[];
  summary: CourseStatusSummary;
}

export function ReviewCenter({ items, summary }: ReviewCenterProps) {
  const [bucket, setBucket] = useState<Bucket>('pending');
  const [optimistic, setOptimistic] = useState<Record<string, ReviewStatus>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const decorated = items.map((i) => ({
      ...i,
      effectiveReview:
        optimistic[i.lessonSlug] ?? (i.status.reviewStatus as ReviewStatus),
    }));
    switch (bucket) {
      case 'no-ai':
        return decorated.filter(
          (i) =>
            !i.status.generated.analysis && !i.status.generated.summary,
        );
      case 'errors':
        return decorated.filter(
          (i) =>
            i.effectiveReview === 'needs_edits' ||
            i.status.aiStatus === 'error',
        );
      case 'approved':
        return decorated.filter((i) => i.effectiveReview === 'approved');
      case 'pending':
        return decorated.filter(
          (i) =>
            i.status.generated.analysis &&
            i.effectiveReview !== 'approved' &&
            i.effectiveReview !== 'needs_edits',
        );
      default:
        return decorated;
    }
  }, [items, bucket, optimistic]);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = {
      'no-ai': 0,
      pending: 0,
      errors: 0,
      approved: 0,
      all: items.length,
    };
    for (const i of items) {
      const review = optimistic[i.lessonSlug] ?? (i.status.reviewStatus as ReviewStatus);
      if (!i.status.generated.analysis && !i.status.generated.summary) c['no-ai']++;
      if (
        i.status.generated.analysis &&
        review !== 'approved' &&
        review !== 'needs_edits'
      )
        c.pending++;
      if (review === 'needs_edits' || i.status.aiStatus === 'error') c.errors++;
      if (review === 'approved') c.approved++;
    }
    return c;
  }, [items, optimistic]);

  async function updateStatus(slug: string, status: ReviewStatus) {
    setOptimistic((prev) => ({ ...prev, [slug]: status }));
    startTransition(async () => {
      try {
        await fetch(`/api/review/${slug}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      } catch {
        /* keep optimistic value */
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Review Center</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.reviewPendingCount}/{summary.totalLessons} da revisionare · {summary.reviewApprovedCount}/{summary.totalLessons} approvate · {summary.totalLessons - summary.aiGeneratedCount}/{summary.totalLessons} senza analisi AI
          </p>
        </div>
      </header>

      <Tabs value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
        <TabsList className="flex-wrap">
          <BucketTrigger value="pending" label="Da revisionare" count={counts.pending} active={bucket === 'pending'} />
          <BucketTrigger value="errors" label="Da correggere" count={counts.errors} active={bucket === 'errors'} />
          <BucketTrigger value="approved" label="Approvate" count={counts.approved} active={bucket === 'approved'} />
          <BucketTrigger value="no-ai" label="Senza AI" count={counts['no-ai']} active={bucket === 'no-ai'} />
          <BucketTrigger value="all" label="Tutte" count={counts.all} active={bucket === 'all'} />
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Nessuna lezione in questo bucket.</p>
            <p className="text-xs text-muted-foreground">
              Cambia bucket o lancia <code className="rounded bg-muted px-1.5">npm run analyze:all</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filtered.map((i) => {
            const ai = i.status.aiStatus as AIStatus;
            const review = i.effectiveReview;
            return (
              <li key={i.lessonSlug}>
                <Card className="overflow-hidden">
                  <div className="h-1 bg-gradient-brand" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {i.moduleTitle}
                        </p>
                        <CardTitle className="mt-0.5 text-base">
                          {i.title}
                        </CardTitle>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={AI_STATUS_VARIANT[ai]}>
                          {AI_STATUS_LABEL[ai]}
                        </Badge>
                        <Badge variant={REVIEW_STATUS_VARIANT[review]}>
                          {REVIEW_STATUS_LABEL[review]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <GenerableDot label="Transcript" enabled={i.status.generated.transcript} />
                      <GenerableDot label="Summary" enabled={i.status.generated.summary} />
                      <GenerableDot label="Visual notes" enabled={i.status.generated.visualNotes} />
                      <GenerableDot label="Checklist" enabled={i.status.generated.checklist} />
                      <GenerableDot label="Quiz" enabled={i.status.generated.quiz} />
                      <GenerableDot label="Flashcards" enabled={i.status.generated.flashcards} />
                      <GenerableDot label="Action plan" enabled={i.status.generated.actionPlan} />
                      <GenerableDot label="Analysis" enabled={i.status.generated.analysis} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/lesson/${i.lessonSlug}`}>
                          <Eye className="h-4 w-4" />
                          Apri revisione
                        </Link>
                      </Button>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(i.lessonSlug, 'needs_edits')}
                          disabled={pending}
                          className="border-amber-400/40 text-amber-300 hover:bg-amber-500/10"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Needs edits
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(i.lessonSlug, 'reviewed')}
                          disabled={pending}
                          className="border-violet-400/40 text-violet-300 hover:bg-violet-500/10"
                        >
                          <Sparkles className="h-4 w-4" />
                          Reviewed
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateStatus(i.lessonSlug, 'approved')}
                          disabled={pending}
                          className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BucketTrigger({
  value,
  label,
  count,
  active,
}: {
  value: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <TabsTrigger value={value} className={cn('gap-2', active && 'shadow-md')}>
      <span>{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-[10px] font-mono',
          active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </TabsTrigger>
  );
}

function GenerableDot({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        enabled
          ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30'
          : 'bg-muted/40 text-muted-foreground/60 ring-1 ring-inset ring-border',
      )}
      title={label}
    >
      {enabled ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <ListChecks className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}
