import { course } from '@/lib/course';
import { AITutorPanel } from '@/components/ai/AITutorPanel';

export const dynamic = 'force-static';

export default function AITutorPage() {
  return <AITutorPanel lessons={course.lessons} />;
}
