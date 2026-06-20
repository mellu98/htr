import { NextRequest, NextResponse } from 'next/server';
import { logCoachTurn } from '@/lib/db/wave-up-queries';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.promptId || !body?.coachResponse || !body?.promptLabel) {
    return NextResponse.json({ error: 'promptId, promptLabel, coachResponse required' }, { status: 400 });
  }
  const turn = await logCoachTurn({
    artistProfileId: body.artistProfileId || null,
    promptId: body.promptId,
    promptLabel: body.promptLabel,
    coachResponse: body.coachResponse,
    sources: body.sources,
  });
  return NextResponse.json({
    turn: {
      id: turn.id,
      promptLabel: turn.promptLabel,
      coachResponse: turn.coachResponse,
      sources: turn.sources ? JSON.parse(turn.sources) : [],
      createdAt: turn.createdAt.toISOString(),
    },
  });
}
