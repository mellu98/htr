import { NextRequest, NextResponse } from 'next/server';
import {
  updateContact,
  deleteContact,
  CONTACT_TYPES,
  CONTACT_STATUSES,
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
  if (body.artistProfileId !== undefined) patch.artistProfileId = body.artistProfileId;
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.type !== undefined) patch.type = asEnum(body.type, CONTACT_TYPES, 'other');
  if (body.email !== undefined) patch.email = body.email;
  if (body.instagram !== undefined) patch.instagram = body.instagram;
  if (body.tiktok !== undefined) patch.tiktok = body.tiktok;
  if (body.website !== undefined) patch.website = body.website;
  if (body.city !== undefined) patch.city = body.city;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.status !== undefined) patch.status = asEnum(body.status, CONTACT_STATUSES, 'new');
  const contact = await updateContact(params.id, patch);
  return NextResponse.json({ ok: true, contact });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteContact(params.id);
  return NextResponse.json({ ok: true });
}