import { NextRequest, NextResponse } from 'next/server';
import { createCallPrepReport } from '@/lib/db/wave-up-queries';
import { getActiveArtist, listTasks } from '@/lib/db/wave-up-queries';
import { getAllLessonProgress } from '@/lib/db/queries';
import { buildCallPrepReport } from '@/lib/wave-up/call-prep';
import { course } from '@/lib/course';

export async function POST(_request: NextRequest) {
  const artist = await getActiveArtist();
  if (!artist) {
    return NextResponse.json(
      { error: 'No active artist — create one in /artist-profile first.' },
      { status: 400 },
    );
  }
  const [tasks, lessonProgress] = await Promise.all([
    listTasks(artist.id),
    getAllLessonProgress(),
  ]);
  const completedLessons = lessonProgress.filter((p) => p.completed).length;
  const videoProgressPercent =
    lessonProgress.length === 0
      ? 0
      : Math.round(
          lessonProgress.reduce((acc, p) => acc + p.videoPercent, 0) /
            lessonProgress.length,
        );

  const report = buildCallPrepReport({
    artist,
    tasks,
    completedLessons,
    totalLessons: course.lessons.length,
    videoProgressPercent,
  });

  const stored = await createCallPrepReport({
    courseId: 'htr-training',
    artistProfileId: artist.id,
    callDate: report.callDate,
    completedSince: report.completedSince,
    openTasks: report.openTasks,
    blocks: report.blocks,
    questions: report.questions,
    decisions: report.decisions,
    nextWeekPlan: report.nextWeekPlan,
    fullMarkdown: report.fullMarkdown,
  });

  return NextResponse.json({
    ok: true,
    report: { id: stored.id, ...report, createdAt: stored.createdAt.toISOString() },
  });
}
