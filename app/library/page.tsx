import { course } from '@/lib/course';
import { getAllLessonRuntimeStatuses } from '@/lib/db/queries';
import { summarizeCourseStatuses } from '@/lib/status-server';
import { VideoLibrary } from '@/components/library/VideoLibrary';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const statusesList = await getAllLessonRuntimeStatuses();
  const statuses = Object.fromEntries(
    statusesList.map((s) => [s.lessonSlug, s]),
  );
  const summary = summarizeCourseStatuses(statusesList);
  return (
    <VideoLibrary
      lessons={course.lessons}
      statuses={statuses}
      summary={summary}
    />
  );
}
