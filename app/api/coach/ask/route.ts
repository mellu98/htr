import { NextRequest, NextResponse } from 'next/server';
import { course } from '@/lib/course';
import { readLessonAnalysis, readSummary } from '@/lib/content';
import {
  runCoach,
  COACH_PROMPTS,
  type CoachPromptId,
} from '@/lib/wave-up/coach';
import { getActiveArtist, listTasks } from '@/lib/db/wave-up-queries';
import { listReleases } from '@/lib/db/release-queries';
import { listContentIdeas } from '@/lib/db/content-queries';
import { listMetricSnapshots } from '@/lib/db/metrics-queries';
import { listGoals } from '@/lib/db/goal-queries';
import { listOutreach } from '@/lib/db/crm-queries';

const PROMPT_IDS = new Set<string>(COACH_PROMPTS.map((p) => p.id));

export async function POST(request: NextRequest) {
  let body: { promptId?: string; lessonSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const promptId = typeof body.promptId === 'string' ? body.promptId : '';
  const lessonSlug = typeof body.lessonSlug === 'string' ? body.lessonSlug : '';

  if (!PROMPT_IDS.has(promptId)) {
    return NextResponse.json({ error: 'promptId required' }, { status: 400 });
  }

  const [artist] = await Promise.all([getActiveArtist()]);
  const lesson = lessonSlug
    ? course.lessons.find((l) => l.slug === lessonSlug) ?? null
    : null;

  if (!artist) {
    // Run the coach with empty context so users without an artist still get
    // something useful (promptId-specific onboarding call-to-action).
    return NextResponse.json({
      ok: true,
      response: runCoach(promptId as CoachPromptId, {
        artist: null,
        lesson: null,
        lessonSlug: lessonSlug || undefined,
        lessonAnalysis: null,
        lessonSummary: null,
        tasks: [],
        activeTaskCount: 0,
        blockedTaskCount: 0,
        nextCallAt: null,
      }),
    });
  }

  const [tasks, releases, ideas, metrics, goals, outreach] = await Promise.all([
    listTasks(artist.id),
    listReleases(artist.id),
    listContentIdeas({ artistProfileId: artist.id }),
    listMetricSnapshots({ artistProfileId: artist.id }),
    listGoals({ artistProfileId: artist.id }),
    listOutreach({ artistProfileId: artist.id }),
  ]);
  const openTasks = tasks.filter((t) => t.status !== 'done');

  const response = runCoach(promptId as CoachPromptId, {
    artist: artist
      ? ({
          ...artist,
          activePlatforms: artist.activePlatforms,
        } as any)
      : null,
    lesson,
    lessonSlug: lessonSlug || undefined,
    lessonAnalysis: lessonSlug ? readLessonAnalysis(lessonSlug) : null,
    lessonSummary: lessonSlug ? readSummary(lessonSlug) : null,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      expectedOutput: t.expectedOutput,
    })),
    activeTaskCount: openTasks.filter((t) => t.status === 'in_progress').length,
    blockedTaskCount: openTasks.filter((t) => t.status === 'blocked').length,
    nextCallAt: artist?.nextCallAt ?? null,
    releases: releases.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      releaseDate: r.releaseDate,
      mainGoal: r.mainGoal,
      milestones: r.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
        dueDate: m.dueDate,
      })),
      contentIdeas: r.contentIdeas.map((c) => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        format: c.format,
        status: c.status,
        publishAt: c.publishAt,
      })),
      goals: r.goals.map((g) => ({
        id: g.id,
        title: g.title,
        metric: g.metric,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        status: g.status,
        deadline: g.deadline,
      })),
      outreach: r.outreach.map((o) => ({
        id: o.id,
        channel: o.channel,
        status: o.status,
        contactName: (o as any).contact?.name ?? 'Contatto',
        nextFollowUpAt: o.nextFollowUpAt,
      })),
    })),
    contentIdeas: ideas.map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      format: c.format,
      status: c.status,
      publishAt: c.publishAt,
    })),
    metrics: metrics.map((m) => ({
      id: m.id,
      platform: m.platform,
      date: m.date,
      followers: m.followers,
      views: m.views,
      streams: m.streams,
      linkClicks: m.linkClicks,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      metric: g.metric,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      status: g.status,
      deadline: g.deadline,
    })),
    outreach: outreach.map((o) => ({
      id: o.id,
      channel: o.channel,
      status: o.status,
      contactName: (o as any).contact?.name ?? 'Contatto',
      nextFollowUpAt: o.nextFollowUpAt,
    })),
  });

  return NextResponse.json({ ok: true, response });
}