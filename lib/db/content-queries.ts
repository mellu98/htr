import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * ContentIdea queries — the artist's content calendar.
 */

export const CONTENT_PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'spotify',
  'newsletter',
  'website',
  'other',
] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_FORMATS = [
  'reel',
  'tiktok',
  'carousel',
  'story',
  'short',
  'post',
  'email',
  'live',
  'other',
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_STATUSES = [
  'idea',
  'draft',
  'approved',
  'scheduled',
  'published',
  'archived',
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

export interface ContentIdeaInput {
  artistProfileId: string;
  releaseId?: string | null;
  platform: ContentPlatform | string;
  format: ContentFormat | string;
  title: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  cta?: string | null;
  status?: ContentStatus | string;
  publishAt?: string | Date | null;
  publishedAt?: string | Date | null;
}

export interface ContentIdeaFilters {
  artistProfileId?: string;
  releaseId?: string;
  platform?: string;
  status?: string;
}

export async function listContentIdeas(filters: ContentIdeaFilters = {}) {
  const where: Prisma.ContentIdeaWhereInput = {};
  if (filters.artistProfileId) where.artistProfileId = filters.artistProfileId;
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.platform) where.platform = filters.platform;
  if (filters.status) where.status = filters.status;
  return prisma.contentIdea.findMany({
    where,
    orderBy: [{ publishAt: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getContentIdea(id: string) {
  return prisma.contentIdea.findUnique({ where: { id } });
}

export async function createContentIdea(input: ContentIdeaInput) {
  return prisma.contentIdea.create({
    data: {
      artistProfileId: input.artistProfileId,
      releaseId: input.releaseId ?? null,
      platform: input.platform,
      format: input.format,
      title: input.title.trim(),
      hook: input.hook?.trim() || null,
      script: input.script?.trim() || null,
      caption: input.caption?.trim() || null,
      cta: input.cta?.trim() || null,
      status: input.status ?? 'idea',
      publishAt: toDateOrNull(input.publishAt),
      publishedAt: toDateOrNull(input.publishedAt),
    },
  });
}

export async function updateContentIdea(
  id: string,
  input: Partial<Omit<ContentIdeaInput, 'artistProfileId'>>,
) {
  const data: Prisma.ContentIdeaUpdateInput = {};
  if (input.releaseId === null) data.release = { disconnect: true };
  else if (input.releaseId !== undefined)
    data.release = { connect: { id: input.releaseId } };
  if (input.platform !== undefined) data.platform = input.platform;
  if (input.format !== undefined) data.format = input.format;
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.hook !== undefined) data.hook = input.hook?.trim() || null;
  if (input.script !== undefined) data.script = input.script?.trim() || null;
  if (input.caption !== undefined) data.caption = input.caption?.trim() || null;
  if (input.cta !== undefined) data.cta = input.cta?.trim() || null;
  if (input.status !== undefined) data.status = input.status;
  if (input.publishAt !== undefined) data.publishAt = toDateOrNull(input.publishAt);
  if (input.publishedAt !== undefined) data.publishedAt = toDateOrNull(input.publishedAt);
  return prisma.contentIdea.update({ where: { id }, data });
}

export async function deleteContentIdea(id: string) {
  await prisma.contentIdea.delete({ where: { id } });
}