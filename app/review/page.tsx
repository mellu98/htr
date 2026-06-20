import { course } from '@/lib/course';
import { getAllLessonRuntimeStatuses } from '@/lib/db/queries';
import { summarizeCourseStatuses } from '@/lib/status-server';
import { ReviewCenter } from '@/components/review/ReviewCenter';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const statusesList = await getAllLessonRuntimeStatuses();
  const summary = summarizeCourseStatuses(statusesList);
  const items = statusesList.map((s) => {
    const lesson = course.lessons.find((l) => l.slug === s.lessonSlug);
    return {
      lessonSlug: s.lessonSlug,
      title: lesson?.title ?? s.lessonSlug,
      moduleTitle: lesson?.moduleTitle ?? '—',
      status: s,
    };
  });

  return <ReviewCenter items={items} summary={summary} />;
}
