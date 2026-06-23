import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * MetricSnapshot queries — manual growth tracking.
 *
 * The user enters follower/views/streams/etc. manually. We store one row
 * per (artist, platform, date) so the dashboard can show "this week vs
 * last week" deltas.
 */

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n);
}

export interface MetricSnapshotInput {
  artistProfileId: string;
  releaseId?: string | null;
  platform: string;
  date: string | Date;
  followers?: number | string | null;
  views?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  shares?: number | string | null;
  saves?: number | string | null;
  streams?: number | string | null;
  monthlyListeners?: number | string | null;
  profileVisits?: number | string | null;
  linkClicks?: number | string | null;
  notes?: string | null;
}

export interface MetricFilters {
  artistProfileId?: string;
  releaseId?: string;
  platform?: string;
  /** Hard cap on rows returned (defaults to unbounded). */
  take?: number;
}

export async function listMetricSnapshots(filters: MetricFilters = {}) {
  const where: Prisma.MetricSnapshotWhereInput = {};
  if (filters.artistProfileId) where.artistProfileId = filters.artistProfileId;
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.platform) where.platform = filters.platform;
  return prisma.metricSnapshot.findMany({
    where,
    orderBy: [{ date: 'desc' }],
    ...(filters.take != null ? { take: filters.take } : {}),
  });
}

export async function createMetricSnapshot(input: MetricSnapshotInput) {
  const date = toDateOrNull(input.date) ?? new Date();
  return prisma.metricSnapshot.create({
    data: {
      artistProfileId: input.artistProfileId,
      releaseId: input.releaseId ?? null,
      platform: input.platform,
      date,
      followers: toIntOrNull(input.followers),
      views: toIntOrNull(input.views),
      likes: toIntOrNull(input.likes),
      comments: toIntOrNull(input.comments),
      shares: toIntOrNull(input.shares),
      saves: toIntOrNull(input.saves),
      streams: toIntOrNull(input.streams),
      monthlyListeners: toIntOrNull(input.monthlyListeners),
      profileVisits: toIntOrNull(input.profileVisits),
      linkClicks: toIntOrNull(input.linkClicks),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function deleteMetricSnapshot(id: string) {
  await prisma.metricSnapshot.delete({ where: { id } });
}

/**
 * Latest two snapshots per (artist, platform) — used by the metrics page
 * to show "this week vs last week" deltas without N queries.
 */
export async function getLatestComparison(artistProfileId: string) {
  const all = await prisma.metricSnapshot.findMany({
    where: { artistProfileId },
    orderBy: [{ platform: 'asc' }, { date: 'desc' }],
  });
  const byPlatform: Record<string, typeof all> = {};
  for (const s of all) {
    if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
    if (byPlatform[s.platform].length < 2) byPlatform[s.platform].push(s);
  }
  return byPlatform;
}