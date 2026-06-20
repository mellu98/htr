import { notFound } from 'next/navigation';
import {
  getLesson,
  getLessonsGrouped,
  getNextLesson,
  getPreviousLesson,
} from '@/lib/course';
import {
  getAllLessonRuntimeStatuses,
  getLessonProgress,
  getLessonRuntimeStatus,
  getNote,
} from '@/lib/db/queries';
import {
  readActionPlan,
  readChecklist,
  readFlashcards,
  readLessonAnalysis,
  readSummary,
  readTranscript,
  readVisualNotes,
  readQuiz,
} from '@/lib/content';
import { LessonShell } from '@/components/lesson/LessonShell';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function LessonPage({ params }: PageProps) {
  const lesson = getLesson(params.slug);
  if (!lesson) notFound();

  const [status, progress, note, statusesList] = await Promise.all([
    getLessonRuntimeStatus(params.slug),
    getLessonProgress(params.slug),
    getNote(params.slug),
    getAllLessonRuntimeStatuses(),
  ]);

  const transcript = readTranscript(params.slug);
  const visualNotes = readVisualNotes(params.slug);
  const summary = readSummary(params.slug);
  const actionPlan = readActionPlan(params.slug);
  const checklist = readChecklist(params.slug);
  const quiz = readQuiz(params.slug);
  const flashcards = readFlashcards(params.slug);
  const analysis = readLessonAnalysis(params.slug);

  const statuses = Object.fromEntries(
    statusesList.map((s) => [s.lessonSlug, s]),
  );

  return (
    <LessonShell
      lesson={lesson}
      prev={getPreviousLesson(params.slug)}
      next={getNextLesson(params.slug)}
      status={status}
      groups={getLessonsGrouped()}
      statuses={statuses}
      initialNote={note?.body ?? null}
      initialWatchedSeconds={progress?.watchedSeconds ?? 0}
      initialPercent={progress?.videoPercent ?? 0}
      content={{
        transcript,
        visualNotes,
        summary,
        actionPlan,
        checklist,
        quiz,
        flashcards,
        analysis,
      }}
    />
  );
}

export function generateMetadata({ params }: PageProps) {
  const lesson = getLesson(params.slug);
  if (!lesson) return { title: 'Lezione non trovata' };
  return {
    title: `${lesson.title} · HTR Training Brain`,
    description: `${lesson.moduleTitle} — ${lesson.duration}`,
  };
}
