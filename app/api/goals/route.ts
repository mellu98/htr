import { NextRequest, NextResponse } from 'next/server';
import {
  listGoals,
  createGoal,
  GOAL_STATUSES,
} from '@/lib/db/goal-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const goals = await listGoals({
    artistProfileId: sp.get('artistProfileId') ?? undefined,
    releaseId: sp.get('releaseId') ?? undefined,
    status: sp.get('status') ?? undefined,
  });
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.title || !body?.metric || body?.targetValue === undefined) {
    return NextResponse.json(
      { error: 'artistProfileId, title, metric, targetValue are required' },
      { status: 400 },
    );
  }
  const goal = await createGoal({
    artistProfileId: String(body.artistProfileId),
    releaseId: body.releaseId ?? null,
    title: String(body.title),
    metric: String(body.metric),
    targetValue: body.targetValue,
    currentValue: body.currentValue ?? 0,
    deadline: body.deadline ?? null,
    status: asEnum(body.status, GOAL_STATUSES, 'active'),
  });
  return NextResponse.json({ ok: true, goal });
}