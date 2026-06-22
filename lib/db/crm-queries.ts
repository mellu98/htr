import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * Contact + Outreach queries — the mini CRM.
 */

export const CONTACT_TYPES = [
  'curator',
  'venue',
  'press',
  'influencer',
  'label',
  'artist',
  'fan',
  'sponsor',
  'other',
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_STATUSES = [
  'new',
  'active',
  'warm',
  'cold',
  'archived',
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const OUTREACH_CHANNELS = [
  'email',
  'instagram',
  'tiktok',
  'whatsapp',
  'phone',
  'other',
] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export const OUTREACH_STATUSES = [
  'to_contact',
  'contacted',
  'replied',
  'interested',
  'rejected',
  'closed',
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Contact ───────────────────────────────────────────────────────────────

export interface ContactInput {
  artistProfileId?: string | null;
  name: string;
  type?: ContactType | string;
  email?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
  city?: string | null;
  notes?: string | null;
  status?: ContactStatus | string;
}

export interface ContactFilters {
  artistProfileId?: string;
  type?: string;
  status?: string;
}

export async function listContacts(filters: ContactFilters = {}) {
  const where: Prisma.ContactWhereInput = {};
  if (filters.artistProfileId) where.artistProfileId = filters.artistProfileId;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  return prisma.contact.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function getContact(id: string) {
  return prisma.contact.findUnique({ where: { id } });
}

export async function createContact(input: ContactInput) {
  return prisma.contact.create({
    data: {
      artistProfileId: input.artistProfileId ?? null,
      name: input.name.trim(),
      type: input.type ?? 'other',
      email: input.email?.trim() || null,
      instagram: input.instagram?.trim() || null,
      tiktok: input.tiktok?.trim() || null,
      website: input.website?.trim() || null,
      city: input.city?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? 'new',
    },
  });
}

export async function updateContact(id: string, input: Partial<ContactInput>) {
  const data: Prisma.ContactUpdateInput = {};
  if (input.artistProfileId === null)
    data.artistProfile = { disconnect: true };
  else if (input.artistProfileId !== undefined)
    data.artistProfile = { connect: { id: input.artistProfileId } };
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.type !== undefined) data.type = input.type;
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.instagram !== undefined) data.instagram = input.instagram?.trim() || null;
  if (input.tiktok !== undefined) data.tiktok = input.tiktok?.trim() || null;
  if (input.website !== undefined) data.website = input.website?.trim() || null;
  if (input.city !== undefined) data.city = input.city?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.status !== undefined) data.status = input.status;
  return prisma.contact.update({ where: { id }, data });
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
}

// ─── Outreach ──────────────────────────────────────────────────────────────

export interface OutreachInput {
  artistProfileId: string;
  releaseId?: string | null;
  contactId: string;
  channel?: OutreachChannel | string;
  status?: OutreachStatus | string;
  message?: string | null;
  lastContactAt?: string | Date | null;
  nextFollowUpAt?: string | Date | null;
}

export interface OutreachFilters {
  artistProfileId?: string;
  releaseId?: string;
  contactId?: string;
  status?: string;
}

export async function listOutreach(filters: OutreachFilters = {}) {
  const where: Prisma.OutreachWhereInput = {};
  if (filters.artistProfileId) where.artistProfileId = filters.artistProfileId;
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.status) where.status = filters.status;
  return prisma.outreach.findMany({
    where,
    include: { contact: true },
    orderBy: [{ nextFollowUpAt: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function getOutreach(id: string) {
  return prisma.outreach.findUnique({
    where: { id },
    include: { contact: true },
  });
}

export async function createOutreach(input: OutreachInput) {
  return prisma.outreach.create({
    data: {
      artistProfileId: input.artistProfileId,
      releaseId: input.releaseId ?? null,
      contactId: input.contactId,
      channel: input.channel ?? 'email',
      status: input.status ?? 'to_contact',
      message: input.message?.trim() || null,
      lastContactAt: toDateOrNull(input.lastContactAt),
      nextFollowUpAt: toDateOrNull(input.nextFollowUpAt),
    },
  });
}

export async function updateOutreach(
  id: string,
  input: Partial<Omit<OutreachInput, 'artistProfileId' | 'contactId'>>,
) {
  const data: Prisma.OutreachUpdateInput = {};
  if (input.releaseId === null) data.release = { disconnect: true };
  else if (input.releaseId !== undefined)
    data.release = { connect: { id: input.releaseId } };
  if (input.channel !== undefined) data.channel = input.channel;
  if (input.status !== undefined) data.status = input.status;
  if (input.message !== undefined) data.message = input.message?.trim() || null;
  if (input.lastContactAt !== undefined) data.lastContactAt = toDateOrNull(input.lastContactAt);
  if (input.nextFollowUpAt !== undefined) data.nextFollowUpAt = toDateOrNull(input.nextFollowUpAt);
  return prisma.outreach.update({ where: { id }, data });
}

export async function deleteOutreach(id: string) {
  await prisma.outreach.delete({ where: { id } });
}