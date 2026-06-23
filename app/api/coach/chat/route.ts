import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { loadCorpus } from '@/lib/chat/corpus';
import { buildSystemPrompt } from '@/lib/chat/prompts';
import { sendChat, type ChatTurn } from '@/lib/chat/post-message';
import { buildGrowthContextBlock } from '@/lib/chat/growth-context';
import {
  getActiveArtist,
  getTaskStats,
  logCoachTurn,
} from '@/lib/db/wave-up-queries';
import prisma from '@/lib/db/index';

/**
 * POST /api/coach/chat
 *
 * Free-form chat endpoint. Replaces the 13-preset button flow for
 * user-typed messages while keeping the corpus-grounded M3 backbone.
 *
 * Now also grounds the model on the active artist's Release Growth
 * System data (active release, milestones, content ideas, goals,
 * outreach follow-ups, latest metrics per platform) via
 * buildGrowthContextBlock(). When the artist has no growth data yet,
 * the model is told to reply with a fixed "create a release / goal /
 * metric snapshot" message for any operational question, while
 * theory questions still fall back to the course corpus.
 *
 * Request body:
 *   { message: string, sessionId?: string, lessonSlug?: string }
 *
 * Response:
 *   { ok: true, reply: string, sources: string[], sessionId: string }
 *   { ok: true, fallback: true, reply: string, sessionId: string }  (no API key)
 *   { error: string }                                                (HTTP 4xx)
 *
 * Persistence: writes TWO CoachConversation rows per request
 *   - role='user'      userMessage = <input>, coachResponse = ''
 *   - role='assistant' userMessage = null,   coachResponse = <reply>
 * Both share the same sessionId so the chat thread can be reconstructed.
 */

const MAX_HISTORY_TURNS = 20;
const MAX_MESSAGE_CHARS = 2000;
const SESSION_LOOKBACK_DAYS = 7;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { message?: string; sessionId?: string; lessonSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `message too long (max ${MAX_MESSAGE_CHARS} chars)` },
      { status: 400 },
    );
  }

  const sessionId = (body.sessionId ?? '').trim() || randomUUID();

  // 1. Active artist (single fetch, shared with the growth builder) +
  //    task stats (for the persona line).
  const artist = await getActiveArtist().catch((err) => {
    console.error('[coach/chat] getActiveArtist failed:', err);
    return null;
  });
  const stats = artist
    ? await getTaskStats(artist.id).catch((err) => {
        console.error('[coach/chat] getTaskStats failed:', err);
        return null;
      })
    : null;

  // 2. Full Release Growth System context. Surface real DB errors so a
  //    hiccup doesn't masquerade as "no data yet" → user sees the fixed
  //    "create a release" message even though they have data.
  const growth = await buildGrowthContextBlock(
    artist ? { id: artist.id, artistName: artist.artistName } : null,
  ).catch((err) => {
    console.error('[coach/chat] buildGrowthContextBlock failed:', err);
    return null;
  });

  // 3. Build system prompt with corpus + growth block.
  const corpus = loadCorpus();
  const system = buildSystemPrompt(corpus, {
    artistName: artist?.artistName ?? null,
    activeTaskCount: stats
      ? (stats.todo ?? 0) + (stats.inProgress ?? 0)
      : null,
    blockedTaskCount: stats?.blocked ?? null,
    growthBlock: growth?.hasData ? growth.block : null,
    // Three-state: undefined = no artist (skip growth section entirely),
    // false = artist exists but no growth data (show MANCANTE message),
    // true = artist + data (use growthBlock).
    growthDataAvailable: artist
      ? growth?.hasData === true
      : undefined,
  });

  // 4. Load recent history for this session (last MAX_HISTORY_TURNS).
  const history = await loadSessionHistory(sessionId, MAX_HISTORY_TURNS);

  // 5. Call M3 with a graceful fallback on any model-side error.
  let result: Awaited<ReturnType<typeof sendChat>> = null;
  try {
    result = await sendChat(system, history, message);
  } catch (err) {
    console.error('[coach/chat] sendChat failed:', err);
    const msg =
      err instanceof Error ? err.message : 'Errore sconosciuto del modello.';
    return NextResponse.json({
      ok: true,
      fallback: true,
      reply:
        "Il coach è temporaneamente non disponibile (errore del modello). " +
        "Riprova tra poco. Dettaglio: " +
        msg.slice(0, 200),
      sources: [],
      sessionId,
    });
  }

  if (!result) {
    // No API key — return a friendly fallback so dev still works.
    return NextResponse.json({
      ok: true,
      fallback: true,
      reply:
        "Modalità offline: la chiave API del modello non è configurata. " +
        "Imposta MINIMAX_API_KEY nelle variabili d'ambiente per attivare il coach conversazionale. " +
        "Nel frattempo puoi consultare i prompt rapidi nella barra a sinistra.",
      sources: [],
      sessionId,
    });
  }

  // 5. Persist both turns.
  await logCoachTurn({
    artistProfileId: artist?.id ?? null,
    promptId: 'chat',
    promptLabel: message.slice(0, 80),
    userMessage: message,
    coachResponse: '',
    sources: [],
    sessionId,
    role: 'user',
  });
  await logCoachTurn({
    artistProfileId: artist?.id ?? null,
    promptId: 'chat',
    promptLabel: 'Coach',
    userMessage: null,
    coachResponse: result.reply,
    sources: result.sources,
    sessionId,
    role: 'assistant',
  });

  return NextResponse.json({
    ok: true,
    reply: result.reply,
    sources: result.sources,
    sessionId,
  });
}

async function loadSessionHistory(
  sessionId: string,
  maxTurns: number,
): Promise<ChatTurn[]> {
  const since = new Date(Date.now() - SESSION_LOOKBACK_DAYS * 86400000);
  const rows = await prisma.coachConversation.findMany({
    where: {
      sessionId,
      role: { in: ['user', 'assistant'] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
    take: maxTurns,
  });
  return rows
    .map<ChatTurn | null>((r) => {
      const content = r.role === 'user' ? r.userMessage : r.coachResponse;
      if (!content) return null;
      return {
        role: r.role === 'user' ? 'user' : 'assistant',
        content,
      };
    })
    .filter((t): t is ChatTurn => t !== null);
}
