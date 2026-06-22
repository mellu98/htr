import { NextRequest, NextResponse } from 'next/server';
import {
  listOutreach,
  createOutreach,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
} from '@/lib/db/crm-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const outreach = await listOutreach({
    artistProfileId: sp.get('artistProfileId') ?? undefined,
    releaseId: sp.get('releaseId') ?? undefined,
    contactId: sp.get('contactId') ?? undefined,
    status: sp.get('status') ?? undefined,
  });
  return NextResponse.json({ outreach });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.artistProfileId || !body?.contactId) {
    return NextResponse.json(
      { error: 'artistProfileId and contactId are required' },
      { status: 400 },
    );
  }
  const out = await createOutreach({
    artistProfileId: String(body.artistProfileId),
    releaseId: body.releaseId ?? null,
    contactId: String(body.contactId),
    channel: asEnum(body.channel, OUTREACH_CHANNELS, 'email'),
    status: asEnum(body.status, OUTREACH_STATUSES, 'to_contact'),
    message: body.message ?? null,
    lastContactAt: body.lastContactAt ?? null,
    nextFollowUpAt: body.nextFollowUpAt ?? null,
  });
  return NextResponse.json({ ok: true, outreach: out });
}