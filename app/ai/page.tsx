import { course } from '@/lib/course';
import { getAllLessonRuntimeStatuses } from '@/lib/db/queries';
import { summarizeCourseStatuses } from '@/lib/status-server';
import { isMiniMaxConfigured } from '@/lib/ai/minimax';
import { AIProcessingPanel } from '@/components/ai/AIProcessingPanel';

export const dynamic = 'force-dynamic';

export default async function AIPage() {
  const statusesList = await getAllLessonRuntimeStatuses();
  const statuses = Object.fromEntries(
    statusesList.map((s) => [s.lessonSlug, s]),
  );
  const summary = summarizeCourseStatuses(statusesList);
  return (
    <AIProcessingPanel
      lessons={course.lessons}
      statuses={statuses}
      summary={summary}
      apiKeyConfigured={isMiniMaxConfigured()}
    />
  );
}
