import { NextRequest, NextResponse } from 'next/server';
import {
  getRelease,
  updateRelease,
  deleteRelease,
  RELEASE_TYPES,
  RELEASE_STATUSES,
} from '@/lib/db/release-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const release = await getRelease(params.id);
  if (!release) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  }
  return NextResponse.json({ release });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const patch: any = {};
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.type !== undefined) patch.type = asEnum(body.type, RELEASE_TYPES, 'single');
  if (body.status !== undefined) patch.status = asEnum(body.status, RELEASE_STATUSES, 'planning');
  if (body.releaseDate !== undefined) patch.releaseDate = body.releaseDate;
  if (body.mainGoal !== undefined) patch.mainGoal = body.mainGoal;
  if (body.budget !== undefined) patch.budget = body.budget;
  if (body.platforms !== undefined) patch.platforms = body.platforms;
  if (body.notes !== undefined) patch.notes = body.notes;
  const release = await updateRelease(params.id, patch);
  return NextResponse.json({ ok: true, release });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteRelease(params.id);
  return NextResponse.json({ ok: true });
}