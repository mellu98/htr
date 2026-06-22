import { NextRequest, NextResponse } from 'next/server';
import {
  listContentIdeas,
  createContentIdea,
  CONTENT_PLATFORMS,
  CONTENT_FORMATS,
  CONTENT_STATUSES,
} from '@/lib/db/content-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const ideas = await listContentIdeas({
    artistProfileId: sp.get('artistProfileId') ?? undefined,
    releaseId: sp.get('releaseId') ?? undefined,
    platform: sp.get('platform') ?? undefined,
    status: sp.get('status') ?? undefined,
  });
  return NextResponse.json({ contentIdeas: ideas });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.platform || !body?.format || !body?.title) {
    return NextResponse.json(
      { error: 'artistProfileId, platform, format, title are required' },
      { status: 400 },
    );
  }
  const idea = await createContentIdea({
    artistProfileId: String(body.artistProfileId),
    releaseId: body.releaseId ?? null,
    platform: asEnum(body.platform, CONTENT_PLATFORMS, 'instagram'),
    format: asEnum(body.format, CONTENT_FORMATS, 'post'),
    title: String(body.title),
    hook: body.hook ?? null,
    script: body.script ?? null,
    caption: body.caption ?? null,
    cta: body.cta ?? null,
    status: asEnum(body.status, CONTENT_STATUSES, 'idea'),
    publishAt: body.publishAt ?? null,
    publishedAt: body.publishedAt ?? null,
  });
  return NextResponse.json({ ok: true, contentIdea: idea });
}