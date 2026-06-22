import { NextRequest, NextResponse } from 'next/server';
import {
  listContacts,
  createContact,
  CONTACT_TYPES,
  CONTACT_STATUSES,
} from '@/lib/db/crm-queries';

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const contacts = await listContacts({
    artistProfileId: sp.get('artistProfileId') ?? undefined,
    type: sp.get('type') ?? undefined,
    status: sp.get('status') ?? undefined,
  });
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body?.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const contact = await createContact({
    artistProfileId: body.artistProfileId ?? null,
    name: String(body.name),
    type: asEnum(body.type, CONTACT_TYPES, 'other'),
    email: body.email ?? null,
    instagram: body.instagram ?? null,
    tiktok: body.tiktok ?? null,
    website: body.website ?? null,
    city: body.city ?? null,
    notes: body.notes ?? null,
    status: asEnum(body.status, CONTACT_STATUSES, 'new'),
  });
  return NextResponse.json({ ok: true, contact });
}