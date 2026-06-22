import { NextRequest, NextResponse } from 'next/server';
import {
  updateOutreach,
  deleteOutreach,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
} from '@/lib/db/crm-queries';

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
  if (body.channel !== undefined) patch.channel = asEnum(body.channel, OUTREACH_CHANNELS, 'email');
  if (body.status !== undefined) patch.status = asEnum(body.status, OUTREACH_STATUSES, 'to_contact');
  if (body.message !== undefined) patch.message = body.message;
  if (body.lastContactAt !== undefined) patch.lastContactAt = body.lastContactAt;
  if (body.nextFollowUpAt !== undefined) patch.nextFollowUpAt = body.nextFollowUpAt;
  const out = await updateOutreach(params.id, patch);
  return NextResponse.json({ ok: true, outreach: out });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteOutreach(params.id);
  return NextResponse.json({ ok: true });
}