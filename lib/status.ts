import type {
  AIStatus,
  LessonRuntimeStatus,
  ReviewStatus,
} from './types';

export const AI_STATUS_LABEL: Record<AIStatus, string> = {
  not_analyzed: 'Not analyzed',
  processing: 'Processing',
  generated: 'Generated',
  reviewed: 'Reviewed',
  approved: 'Approved',
  error: 'Needs edits',
};

export const AI_STATUS_VARIANT: Record<
  AIStatus,
  'muted' | 'cyan' | 'violet' | 'blue' | 'success' | 'warning'
> = {
  not_analyzed: 'muted',
  processing: 'cyan',
  generated: 'violet',
  reviewed: 'blue',
  approved: 'success',
  error: 'warning',
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending review',
  reviewed: 'Reviewed',
  needs_edits: 'Needs edits',
  approved: 'Approved',
};

export const REVIEW_STATUS_VARIANT: Record<
  ReviewStatus,
  'muted' | 'cyan' | 'violet' | 'success' | 'warning'
> = {
  pending: 'muted',
  reviewed: 'violet',
  needs_edits: 'warning',
  approved: 'success',
};

export function runtimeHasGeneratedContent(s: LessonRuntimeStatus): boolean {
  return s.generated.transcript || s.generated.summary || s.generated.analysis;
}

export function runtimeOverallCompletion(s: LessonRuntimeStatus): number {
  let total = 0;
  let done = 0;
  total += 1;
  if (s.videoPresent) done += 0.25;
  if (s.generated.transcript) done += 0.25;
  if (s.generated.analysis) done += 0.25;
  if (s.progress.completed) done += 0.25;
  return Math.round((done / Math.max(total, 1)) * 100);
}

/**
 * Course-wide counter snapshot. Defined here (not in status-server.ts) so
 * client components can import the type without pulling in node:fs /
 * node:path. The actual computation lives in status-server.ts.
 */
export interface CourseStatusSummary {
  totalLessons: number;
  videoImportedCount: number;
  missingVideosCount: number;
  aiGeneratedCount: number;
  aiPendingCount: number;
  reviewPendingCount: number;
  reviewApprovedCount: number;
  reviewNeedsEditsCount: number;
}