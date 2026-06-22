import { NextRequest, NextResponse } from 'next/server';
import {
  updateContentIdea,
  deleteContentIdea,
  CONTENT_PLATFORMS,
  CONTENT_FORMATS,
  CONTENT_STATUSES,
} from '@/lib/db/content-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const patch: any = {};
  if (body.releaseId !== undefined) patch.releaseId = body.releaseId;
  if (body.platform !== undefined) patch.platform = asEnum(body.platform, CONTENT_PLATFORMS, 'instagram');
  if (body.format !== undefined) patch.format = asEnum(body.format, CONTENT_FORMATS, 'post');
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.hook !== undefined) patch.hook = body.hook;
  if (body.script !== undefined) patch.script = body.script;
  if (body.caption !== undefined) patch.caption = body.caption;
  if (body.cta !== undefined) patch.cta = body.cta;
  if (body.status !== undefined) patch.status = asEnum(body.status, CONTENT_STATUSES, 'idea');
  if (body.publishAt !== undefined) patch.publishAt = body.publishAt;
  if (body.publishedAt !== undefined) patch.publishedAt = body.publishedAt;
  const idea = await updateContentIdea(params.id, patch);
  return NextResponse.json({ ok: true, contentIdea: idea });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteContentIdea(params.id);
  return NextResponse.json({ ok: true });
}