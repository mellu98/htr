import prisma from '@/lib/db';
import { course } from '@/lib/course';
import { readActionPlan, readChecklist } from '@/lib/content';
import { AllNotesView, type NoteRow } from '@/components/notes/AllNotesView';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const dbNotes = await prisma.note.findMany({
    orderBy: { updatedAt: 'desc' },
    where: { courseId: 'htr-training' },
  });

  const notes: NoteRow[] = dbNotes.map((n) => {
    const lesson = course.lessons.find((l) => l.slug === n.lessonSlug);
    return {
      id: n.id,
      slug: n.lessonSlug,
      title: lesson?.title ?? n.lessonSlug,
      moduleTitle: lesson?.moduleTitle ?? 'Lezione',
      body: n.body,
      updatedAt: n.updatedAt.toISOString(),
      actionPlan: readActionPlan(n.lessonSlug) ?? undefined,
      checklist: readChecklist(n.lessonSlug)?.map((c) => ({
        id: c.id,
        title: c.title,
      })),
    };
  });

  return (
    <AllNotesView
      notes={notes}
      courseTitle={course.title}
      totalLessons={course.lessons.length}
    />
  );
}
