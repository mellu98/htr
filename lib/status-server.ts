/**
 * Server-only course status aggregations.
 *
 * Imports node:fs / node:path, so it MUST NOT be imported from any
 * client component. Use this only in server-side code (route handlers,
 * page.tsx files, server components).
 *
 * For client components that just need the types/labels, import from
 * @/lib/status instead.
 *
 * Single source of truth for course-wide counters used by /library,
 * /dashboard, /review, /ai.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { LessonRuntimeStatus } from './types';
import type { CourseStatusSummary } from './status';

export type { CourseStatusSummary };

// ---------------------------------------------------------------------------
// Definitions:
//   videoImported:    a real MP4 exists at public/videos/<videoPath basename>
//   aiGenerated:      content/generated/<slug>/ contains ALL 8 expected files
//                     AND generated.analysis + generated.summary exist on
//                     the runtime status
//   reviewPending:    aiStatus === 'generated' (or beyond) AND review not
//                     yet approved
//   reviewApproved:   reviewStatus === 'approved'
//   missingVideos:    no MP4 on disk for the lesson's expectedFileName
// ---------------------------------------------------------------------------

const REQUIRED_GENERATED_FILES = [
  'transcript.md',
  'visual-notes.md',
  'summary.md',
  'checklist.json',
  'quiz.json',
  'flashcards.json',
  'action-plan.md',
  'lesson-analysis.json',
] as const;

function generatedDir(slug: string): string {
  return path.join(process.cwd(), 'content', 'generated', slug);
}

export function isVideoFilePresent(videoPath: string): boolean {
  if (!videoPath) return false;
  const filename = path.basename(videoPath);
  const fullPath = path.join(process.cwd(), 'public', 'videos', filename);
  return fs.existsSync(fullPath);
}

export function isGeneratedComplete(slug: string): boolean {
  const dir = generatedDir(slug);
  if (!fs.existsSync(dir)) return false;
  return REQUIRED_GENERATED_FILES.every((f) =>
    fs.existsSync(path.join(dir, f)),
  );
}

/**
 * Compute the canonical course-wide counter snapshot from a list of
 * LessonRuntimeStatus records.
 *
 * Pure function (no I/O). Pass in the statuses you've already loaded
 * (typically from getAllLessonRuntimeStatuses()) and get back every counter
 * the UI needs. Do not recompute this logic inline in components.
 */
export function summarizeCourseStatuses(
  statuses: LessonRuntimeStatus[],
): CourseStatusSummary {
  const totalLessons = statuses.length;
  let videoImportedCount = 0;
  let missingVideosCount = 0;
  let aiGeneratedCount = 0;
  let aiPendingCount = 0;
  let reviewPendingCount = 0;
  let reviewApprovedCount = 0;
  let reviewNeedsEditsCount = 0;

  for (const s of statuses) {
    if (s.videoPresent) videoImportedCount++;
    else missingVideosCount++;

    if (s.generated.analysis && s.generated.summary) aiGeneratedCount++;
    else aiPendingCount++;

    if (
      s.generated.analysis &&
      s.reviewStatus !== 'approved' &&
      s.aiStatus !== 'approved'
    ) {
      reviewPendingCount++;
    }
    if (s.reviewStatus === 'approved') reviewApprovedCount++;
    if (s.reviewStatus === 'needs_edits') reviewNeedsEditsCount++;
  }

  return {
    totalLessons,
    videoImportedCount,
    missingVideosCount,
    aiGeneratedCount,
    aiPendingCount,
    reviewPendingCount,
    reviewApprovedCount,
    reviewNeedsEditsCount,
  };
}