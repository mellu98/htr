import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma client instance for the whole app.
 *
 * In dev, Next.js HMR can re-evaluate the module — we cache the client on
 * `globalThis` to avoid exhausting connections.
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
