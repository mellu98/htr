import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * Goal queries — measurable objectives with current vs target value.
 */

export const GOAL_STATUSES = [
  'active',
  'achieved',
  'missed',
  'archived',
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toFloatOrNull(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

export interface GoalInput {
  artistProfileId: string;
  releaseId?: string | null;
  title: string;
  metric: string;
  targetValue: number | string;
  currentValue?: number | string | null;
  deadline?: string | Date | null;
  status?: GoalStatus | string;
}

export interface GoalFilters {
  artistProfileId?: string;
  releaseId?: string;
  status?: string;
}

export async function listGoals(filters: GoalFilters = {}) {
  const where: Prisma.GoalWhereInput = {};
  if (filters.artistProfileId) where.artistProfileId = filters.artistProfileId;
  if (filters.releaseId) where.releaseId = filters.releaseId;
  if (filters.status) where.status = filters.status;
  return prisma.goal.findMany({
    where,
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
  });
}

export async function getGoal(id: string) {
  return prisma.goal.findUnique({ where: { id } });
}

export async function createGoal(input: GoalInput) {
  return prisma.goal.create({
    data: {
      artistProfileId: input.artistProfileId,
      releaseId: input.releaseId ?? null,
      title: input.title.trim(),
      metric: input.metric.trim(),
      targetValue: toFloatOrNull(input.targetValue),
      currentValue: toFloatOrNull(input.currentValue, 0),
      deadline: toDateOrNull(input.deadline),
      status: input.status ?? 'active',
    },
  });
}

export async function updateGoal(
  id: string,
  input: Partial<Omit<GoalInput, 'artistProfileId'>>,
) {
  const data: Prisma.GoalUpdateInput = {};
  if (input.releaseId === null) data.release = { disconnect: true };
  else if (input.releaseId !== undefined)
    data.release = { connect: { id: input.releaseId } };
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.metric !== undefined) data.metric = input.metric.trim();
  if (input.targetValue !== undefined) data.targetValue = toFloatOrNull(input.targetValue);
  if (input.currentValue !== undefined) data.currentValue = toFloatOrNull(input.currentValue, 0);
  if (input.deadline !== undefined) data.deadline = toDateOrNull(input.deadline);
  if (input.status !== undefined) data.status = input.status;
  return prisma.goal.update({ where: { id }, data });
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
}