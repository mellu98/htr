import prisma from './index';
import type { Prisma } from '@prisma/client';

/**
 * Wave Up — data access layer.
 *
 * Thin wrappers over Prisma that the Wave Up pages call. Keeps page
 * components readable and makes it trivial to add caching or batching later.
 *
 * "Active artist" semantics: at most one ArtistProfile per install is
 * considered active. AppSettings.activeArtistId stores the selection; if
 * none is set we use the most recently updated profile.
 */

export type ArtistWithStats = Prisma.ArtistProfileGetPayload<{
  // No relations to expand here, but keep type aligned.
}>;

export async function getActiveArtist(): Promise<ArtistWithStats | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'singleton' },
  });
  if (settings?.activeArtistId) {
    const artist = await prisma.artistProfile.findUnique({
      where: { id: settings.activeArtistId },
    });
    if (artist) return artist;
  }
  // Fallback: most recently updated.
  const fallback = await prisma.artistProfile.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  return fallback;
}

export async function listArtists(): Promise<ArtistWithStats[]> {
  return prisma.artistProfile.findMany({ orderBy: { updatedAt: 'desc' } });
}

export async function getArtist(id: string): Promise<ArtistWithStats | null> {
  return prisma.artistProfile.findUnique({ where: { id } });
}

export async function getArtistByArtistName(
  artistName: string,
): Promise<ArtistWithStats | null> {
  return prisma.artistProfile.findFirst({
    where: { artistName: { equals: artistName } },
  });
}

export interface ArtistProfileInput {
  artistName: string;
  musicGenre?: string;
  currentLevel?: string;
  mainGoal?: string;
  targetAudience?: string;
  nextReleaseDate?: string | Date | null;
  activePlatforms?: string[];
  biggestBlock?: string;
  brandKeywords?: string;
  referenceArtists?: string;
  notes?: string;
  weeklyCallDay?: string;
  nextCallAt?: string | Date | null;
}

function normalizeDates(input: {
  nextReleaseDate?: string | Date | null;
  nextCallAt?: string | Date | null;
}): {
  nextReleaseDate: Date | null;
  nextCallAt: Date | null;
} {
  const toDate = (v: string | Date | null | undefined): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  return {
    nextReleaseDate: toDate(input.nextReleaseDate),
    nextCallAt: toDate(input.nextCallAt),
  };
}

export async function createArtist(input: ArtistProfileInput) {
  const dates = normalizeDates(input);
  const created = await prisma.artistProfile.create({
    data: {
      artistName: input.artistName.trim(),
      musicGenre: input.musicGenre?.trim() || null,
      currentLevel: input.currentLevel?.trim() || null,
      mainGoal: input.mainGoal?.trim() || null,
      targetAudience: input.targetAudience?.trim() || null,
      nextReleaseDate: dates.nextReleaseDate,
      activePlatforms: input.activePlatforms?.length
        ? JSON.stringify(input.activePlatforms)
        : null,
      biggestBlock: input.biggestBlock?.trim() || null,
      brandKeywords: input.brandKeywords?.trim() || null,
      referenceArtists: input.referenceArtists?.trim() || null,
      notes: input.notes?.trim() || null,
      weeklyCallDay: input.weeklyCallDay?.trim() || null,
      nextCallAt: dates.nextCallAt,
    },
  });
  await setActiveArtist(created.id);
  return created;
}

export async function updateArtist(
  id: string,
  input: Partial<ArtistProfileInput>,
) {
  const dates = normalizeDates({
    nextReleaseDate: input.nextReleaseDate as any,
    nextCallAt: input.nextCallAt as any,
  });
  return prisma.artistProfile.update({
    where: { id },
    data: {
      artistName: input.artistName?.trim(),
      musicGenre: input.musicGenre?.trim(),
      currentLevel: input.currentLevel?.trim(),
      mainGoal: input.mainGoal?.trim(),
      targetAudience: input.targetAudience?.trim(),
      nextReleaseDate: dates.nextReleaseDate,
      activePlatforms: input.activePlatforms?.length
        ? JSON.stringify(input.activePlatforms)
        : null,
      biggestBlock: input.biggestBlock?.trim(),
      brandKeywords: input.brandKeywords?.trim(),
      referenceArtists: input.referenceArtists?.trim(),
      notes: input.notes?.trim(),
      weeklyCallDay: input.weeklyCallDay?.trim(),
      nextCallAt: dates.nextCallAt,
    },
  });
}

export async function deleteArtist(id: string) {
  await prisma.artistProfile.delete({ where: { id } });
}

export async function setActiveArtist(id: string) {
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', activeArtistId: id },
    update: { activeArtistId: id },
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskInput {
  artistProfileId: string;
  managerArtistId?: string | null;
  courseId?: string;
  lessonSlug?: string | null;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | Date | null;
  expectedOutput?: string;
  coachPromptId?: string;
}

export async function listTasks(artistProfileId: string) {
  return prisma.task.findMany({
    where: { artistProfileId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function listAllTasks() {
  return prisma.task.findMany({
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: { artistProfile: true, managerArtist: true },
  });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({ where: { id } });
}

export async function createTask(input: TaskInput) {
  const dueDate = input.dueDate
    ? new Date(input.dueDate)
    : null;
  return prisma.task.create({
    data: {
      artistProfileId: input.artistProfileId,
      managerArtistId: input.managerArtistId ?? null,
      courseId: input.courseId ?? 'htr-training',
      lessonSlug: input.lessonSlug ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'todo',
      dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
      expectedOutput: input.expectedOutput?.trim() || null,
      coachPromptId: input.coachPromptId ?? null,
    },
  });
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput> & { status?: TaskStatus },
) {
  const data: any = { ...input };
  if (input.dueDate !== undefined) {
    const d = input.dueDate ? new Date(input.dueDate) : null;
    data.dueDate = d && !isNaN(d.getTime()) ? d : null;
  }
  const incomingStatus: string | undefined = input.status;
  if (incomingStatus === 'done') {
    data.completedAt = new Date();
  } else if (incomingStatus !== undefined && incomingStatus !== 'done') {
    data.completedAt = null;
  }
  // Strip relations & non-column fields from `data`.
  delete data.artistProfileId;
  delete data.managerArtistId;
  delete data.coachPromptId;
  delete data.courseId;
  return prisma.task.update({ where: { id }, data });
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  blocked: number;
  overdue: number;
}

export async function getTaskStats(
  artistProfileId: string,
): Promise<TaskStats> {
  const tasks = await listTasks(artistProfileId);
  const now = new Date();
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    overdue: tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'done',
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export type ManagerArtistWithProfile = Prisma.ManagerArtistGetPayload<{
  include: { artistProfile: true };
}>;

export async function listManagerArtists(): Promise<ManagerArtistWithProfile[]> {
  return prisma.managerArtist.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { artistProfile: true },
  });
}

export async function attachArtistToManager(
  artistProfileId: string,
  nickname?: string,
) {
  return prisma.managerArtist.create({
    data: {
      artistProfileId,
      nickname: nickname?.trim() || null,
    },
  });
}

export async function refreshManagerStats(managerArtistId: string) {
  const card = await prisma.managerArtist.findUnique({
    where: { id: managerArtistId },
  });
  if (!card) return null;
  const tasks = await prisma.task.findMany({
    where: { managerArtistId },
  });
  const open = tasks.filter((t) => t.status !== 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  return prisma.managerArtist.update({
    where: { id: managerArtistId },
    data: {
      openTasksCount: open,
      blockedTasksCount: blocked,
    },
  });
}

// ---------------------------------------------------------------------------
// Coach conversation
// ---------------------------------------------------------------------------

export async function logCoachTurn(input: {
  artistProfileId?: string | null;
  promptId: string;
  promptLabel: string;
  userMessage?: string;
  coachResponse: string;
  sources?: string[];
}) {
  return prisma.coachConversation.create({
    data: {
      artistProfileId: input.artistProfileId ?? null,
      promptId: input.promptId,
      promptLabel: input.promptLabel,
      userMessage: input.userMessage ?? null,
      coachResponse: input.coachResponse,
      sources: input.sources?.length ? JSON.stringify(input.sources) : null,
    },
  });
}

export async function listCoachHistory(artistProfileId?: string | null) {
  return prisma.coachConversation.findMany({
    where: artistProfileId ? { artistProfileId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
}

// ---------------------------------------------------------------------------
// Call Prep
// ---------------------------------------------------------------------------

export async function listCallPrepReports(artistProfileId: string) {
  return prisma.callPrepReport.findMany({
    where: { artistProfileId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export async function createCallPrepReport(input: {
  courseId?: string;
  artistProfileId: string;
  callDate?: Date | null;
  completedSince: string;
  openTasks: string;
  blocks: string;
  questions: string;
  decisions: string;
  nextWeekPlan: string;
  fullMarkdown: string;
}) {
  return prisma.callPrepReport.create({
    data: {
      courseId: input.courseId ?? 'htr-training',
      artistProfileId: input.artistProfileId,
      callDate: input.callDate ?? null,
      completedSince: input.completedSince,
      openTasks: input.openTasks,
      blocks: input.blocks,
      questions: input.questions,
      decisions: input.decisions,
      nextWeekPlan: input.nextWeekPlan,
      fullMarkdown: input.fullMarkdown,
    },
  });
}
