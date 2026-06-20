import prisma from './index';
import type {
  AIStatus,
  LessonRuntimeStatus,
  ReviewStatus,
} from '@/lib/types';
import { course, getLesson } from '@/lib/course';
import {
  getLessonGeneratedSummary,
  isVideoPresent,
} from '@/lib/content';

/**
 * Lightweight façade for the most common DB reads/writes.
 * Pages call these instead of touching Prisma directly so that the UI is
 * trivial to swap to a different backend later.
 */

const COURSE_ID = course.id;

export async function getLessonProgress(slug: string) {
  return prisma.lessonProgress.findUnique({
    where: { courseId_lessonId: { courseId: COURSE_ID, lessonId: slug } },
  });
}

export async function upsertLessonProgress(
  slug: string,
  data: {
    watchedSeconds?: number;
    videoPercent?: number;
    completed?: boolean;
    applied?: boolean;
  },
) {
  return prisma.lessonProgress.upsert({
    where: { courseId_lessonId: { courseId: COURSE_ID, lessonId: slug } },
    create: {
      courseId: COURSE_ID,
      lessonId: slug,
      lessonSlug: slug,
      watchedSeconds: data.watchedSeconds ?? 0,
      videoPercent: data.videoPercent ?? 0,
      completed: data.completed ?? false,
      applied: data.applied ?? false,
    },
    update: {
      ...data,
      lastWatchedAt: new Date(),
    },
  });
}

export async function getAllLessonProgress() {
  return prisma.lessonProgress.findMany({ where: { courseId: COURSE_ID } });
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getNote(slug: string) {
  return prisma.note.findFirst({
    where: { courseId: COURSE_ID, lessonSlug: slug },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertNote(slug: string, body: string) {
  const existing = await getNote(slug);
  if (existing) {
    return prisma.note.update({
      where: { id: existing.id },
      data: { body },
    });
  }
  return prisma.note.create({
    data: { courseId: COURSE_ID, lessonSlug: slug, lessonId: slug, body },
  });
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export async function listBookmarks(slug: string) {
  return prisma.bookmark.findMany({
    where: { courseId: COURSE_ID, lessonSlug: slug },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBookmark(
  slug: string,
  data: { title: string; note?: string; videoTime?: number },
) {
  return prisma.bookmark.create({
    data: {
      courseId: COURSE_ID,
      lessonSlug: slug,
      lessonId: slug,
      title: data.title,
      note: data.note,
      videoTime: data.videoTime,
    },
  });
}

export async function deleteBookmark(id: string) {
  return prisma.bookmark.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Checklist / Quiz / Flashcards
// ---------------------------------------------------------------------------

export async function getChecklistProgress(slug: string) {
  return prisma.checklistProgress.findMany({
    where: { courseId: COURSE_ID, lessonSlug: slug },
  });
}

export async function setChecklistItem(
  slug: string,
  itemId: string,
  completed: boolean,
) {
  return prisma.checklistProgress.upsert({
    where: {
      courseId_lessonId_itemId: {
        courseId: COURSE_ID,
        lessonId: slug,
        itemId,
      },
    },
    create: {
      courseId: COURSE_ID,
      lessonId: slug,
      lessonSlug: slug,
      itemId,
      completed,
      completedAt: completed ? new Date() : null,
    },
    update: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
}

export async function getFlashcardProgress(slug: string) {
  return prisma.flashcardProgress.findMany({
    where: { courseId: COURSE_ID, lessonSlug: slug },
  });
}

export async function setFlashcardStatus(
  slug: string,
  cardId: string,
  status: 'known' | 'review' | 'unknown',
) {
  return prisma.flashcardProgress.upsert({
    where: {
      courseId_lessonId_cardId: {
        courseId: COURSE_ID,
        lessonId: slug,
        cardId,
      },
    },
    create: {
      courseId: COURSE_ID,
      lessonId: slug,
      lessonSlug: slug,
      cardId,
      status,
    },
    update: { status },
  });
}

export async function recordQuizAttempt(
  slug: string,
  data: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    answers: Record<string, string>;
  },
) {
  return prisma.quizAttempt.create({
    data: {
      courseId: COURSE_ID,
      lessonSlug: slug,
      lessonId: slug,
      score: data.score,
      totalQuestions: data.totalQuestions,
      correctAnswers: data.correctAnswers,
      answers: JSON.stringify(data.answers),
    },
  });
}

// ---------------------------------------------------------------------------
// Review Status
// ---------------------------------------------------------------------------

export async function getReviewStatus(slug: string) {
  return prisma.reviewStatus.findUnique({
    where: { courseId_lessonId: { courseId: COURSE_ID, lessonId: slug } },
  });
}

export async function setReviewStatus(
  slug: string,
  status: ReviewStatus,
  notes?: string,
  reviewerNotes?: string,
) {
  return prisma.reviewStatus.upsert({
    where: { courseId_lessonId: { courseId: COURSE_ID, lessonId: slug } },
    create: {
      courseId: COURSE_ID,
      lessonId: slug,
      lessonSlug: slug,
      status,
      notes,
      reviewerNotes,
    },
    update: { status, notes, reviewerNotes },
  });
}

// ---------------------------------------------------------------------------
// Aggregations (Dashboard)
// ---------------------------------------------------------------------------

export interface CourseOverview {
  totalLessons: number;
  videoImported: number;
  aiCompleted: number;
  transcripts: number;
  checklists: number;
  videoProgressPercent: number;
  studyProgressPercent: number;
  applicationProgressPercent: number;
  lessonsCompleted: number;
  lessonsApplied: number;
}

export async function getCourseOverview(): Promise<CourseOverview> {
  const progressList = await getAllLessonProgress();
  const summaries = course.lessons.map((l) => ({
    lesson: l,
    summary: getLessonGeneratedSummary(l.slug),
    videoPresent: isVideoPresent(l.videoPath),
  }));

  const totalLessons = summaries.length;
  const videoImported = summaries.filter((s) => s.videoPresent).length;
  const aiCompleted = summaries.filter((s) => s.summary.analysis).length;
  const transcripts = summaries.filter((s) => s.summary.transcript).length;
  const checklists = summaries.filter((s) => s.summary.checklist).length;

  const lessonsCompleted = progressList.filter((p) => p.completed).length;
  const lessonsApplied = progressList.filter((p) => p.applied).length;

  const avgVideo =
    progressList.length === 0
      ? 0
      : Math.round(
          progressList.reduce((acc, p) => acc + p.videoPercent, 0) /
            progressList.length,
        );

  return {
    totalLessons,
    videoImported,
    aiCompleted,
    transcripts,
    checklists,
    videoProgressPercent: avgVideo,
    studyProgressPercent: Math.round((lessonsCompleted / Math.max(totalLessons, 1)) * 100),
    applicationProgressPercent: Math.round((lessonsApplied / Math.max(totalLessons, 1)) * 100),
    lessonsCompleted,
    lessonsApplied,
  };
}

// ---------------------------------------------------------------------------
// Runtime status (per lesson) — used by Video Library, Lesson page, Review.
// ---------------------------------------------------------------------------

export async function getLessonRuntimeStatus(slug: string): Promise<LessonRuntimeStatus> {
  const lesson = getLesson(slug);
  if (!lesson) {
    throw new Error(`Unknown lesson slug: ${slug}`);
  }
  const summary = getLessonGeneratedSummary(slug);
  const progress = await getLessonProgress(slug);
  const review = await getReviewStatus(slug);

  let aiStatus: AIStatus = 'not_analyzed';
  if (summary.analysis) {
    aiStatus = 'generated';
    if (review?.status === 'approved') aiStatus = 'approved';
    else if (review?.status === 'reviewed') aiStatus = 'reviewed';
    else if (review?.status === 'needs_edits') aiStatus = 'error';
  }

  return {
    lessonSlug: slug,
    videoPresent: isVideoPresent(lesson.videoPath),
    aiStatus,
    reviewStatus: (review?.status as ReviewStatus) ?? 'pending',
    generated: summary,
    progress: {
      videoPercent: progress?.videoPercent ?? 0,
      completed: progress?.completed ?? false,
      applied: progress?.applied ?? false,
    },
  };
}

export async function getAllLessonRuntimeStatuses(): Promise<LessonRuntimeStatus[]> {
  return Promise.all(course.lessons.map((l) => getLessonRuntimeStatus(l.slug)));
}
