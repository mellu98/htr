import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * Release + ReleaseMilestone queries.
 *
 * Thin Prisma wrappers. Keep all date / null normalization here so the API
 * route handlers stay clean.
 */

export const RELEASE_TYPES = [
  'single',
  'ep',
  'album',
  'videoclip',
  'live',
  'campaign',
] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const RELEASE_STATUSES = [
  'planning',
  'pre_release',
  'released',
  'post_release',
  'archived',
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const MILESTONE_STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type MilestonePriority = (typeof MILESTONE_PRIORITIES)[number];

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toFloatOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parsePlatforms(v: unknown): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    // Accept either JSON or comma-separated
    if (trimmed.startsWith('[')) return trimmed;
    return JSON.stringify(
      trimmed.split(',').map((s) => s.trim()).filter(Boolean),
    );
  }
  return null;
}

// ─── Release ───────────────────────────────────────────────────────────────

export interface ReleaseInput {
  artistProfileId: string;
  title: string;
  type?: ReleaseType | string;
  status?: ReleaseStatus | string;
  releaseDate?: string | Date | null;
  mainGoal?: string | null;
  budget?: number | string | null;
  platforms?: string[] | string | null;
  notes?: string | null;
}

export type ReleaseWithRelations = Prisma.ReleaseGetPayload<{
  include: {
    milestones: true;
    contentIdeas: true;
    metrics: true;
    goals: true;
    outreach: true;
  };
}>;

export async function listReleases(
  artistProfileId?: string,
): Promise<ReleaseWithRelations[]> {
  return prisma.release.findMany({
    where: artistProfileId ? { artistProfileId } : undefined,
    orderBy: [{ releaseDate: 'asc' }, { updatedAt: 'desc' }],
    include: {
      milestones: true,
      contentIdeas: true,
      metrics: true,
      goals: true,
      outreach: true,
    },
  });
}

export async function getRelease(id: string): Promise<ReleaseWithRelations | null> {
  return prisma.release.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
      contentIdeas: { orderBy: [{ publishAt: 'asc' }, { createdAt: 'desc' }] },
      metrics: { orderBy: [{ date: 'desc' }] },
      goals: { orderBy: [{ status: 'asc' }, { deadline: 'asc' }] },
      outreach: { orderBy: [{ nextFollowUpAt: 'asc' }] },
    },
  });
}

export async function createRelease(input: ReleaseInput) {
  return prisma.release.create({
    data: {
      artistProfileId: input.artistProfileId,
      title: input.title.trim(),
      type: input.type ?? 'single',
      status: input.status ?? 'planning',
      releaseDate: toDateOrNull(input.releaseDate),
      mainGoal: input.mainGoal?.trim() || null,
      budget: toFloatOrNull(input.budget),
      platforms: parsePlatforms(input.platforms),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function updateRelease(id: string, input: Partial<ReleaseInput>) {
  const data: Prisma.ReleaseUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.type !== undefined) data.type = input.type;
  if (input.status !== undefined) data.status = input.status;
  if (input.releaseDate !== undefined) data.releaseDate = toDateOrNull(input.releaseDate);
  if (input.mainGoal !== undefined) data.mainGoal = input.mainGoal?.trim() || null;
  if (input.budget !== undefined) data.budget = toFloatOrNull(input.budget);
  if (input.platforms !== undefined) data.platforms = parsePlatforms(input.platforms);
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  return prisma.release.update({ where: { id }, data });
}

export async function deleteRelease(id: string) {
  await prisma.release.delete({ where: { id } });
}

// ─── ReleaseMilestone ──────────────────────────────────────────────────────

export interface ReleaseMilestoneInput {
  releaseId: string;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  status?: MilestoneStatus | string;
  priority?: MilestonePriority | string;
}

export async function listMilestones(releaseId?: string) {
  return prisma.releaseMilestone.findMany({
    where: releaseId ? { releaseId } : undefined,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
}

export async function createMilestone(input: ReleaseMilestoneInput) {
  return prisma.releaseMilestone.create({
    data: {
      releaseId: input.releaseId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      dueDate: toDateOrNull(input.dueDate),
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
    },
  });
}

export async function updateMilestone(
  id: string,
  input: Partial<Omit<ReleaseMilestoneInput, 'releaseId'>>,
) {
  const data: Prisma.ReleaseMilestoneUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.dueDate !== undefined) data.dueDate = toDateOrNull(input.dueDate);
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  return prisma.releaseMilestone.update({ where: { id }, data });
}

export async function deleteMilestone(id: string) {
  await prisma.releaseMilestone.delete({ where: { id } });
}