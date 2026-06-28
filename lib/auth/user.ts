import { PrismaClient } from '@prisma/client';
import { hashPassword } from './password';

const prisma = new PrismaClient();

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: string;
}) {
  const hashedPassword = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name ?? null,
      password: hashedPassword,
      role: data.role ?? 'admin',
    },
  });
}

/**
 * Ensures at least one admin user exists.
 *
 * If the database has no users, it reads ADMIN_SEED from the environment
 * (expected format: `email:password`) and creates the first admin.
 *
 * Call this from seed scripts and the remote seed endpoint so a fresh
 * deployment is immediately loggable-in.
 */
export async function ensureAdminUser(): Promise<{
  created: boolean;
  email?: string;
  message: string;
}> {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return { created: false, message: 'Users already exist, skipping admin seed' };
  }

  const seed = process.env.ADMIN_SEED;
  if (!seed) {
    return {
      created: false,
      message: 'No users exist and ADMIN_SEED is not set; login will not work until a user is created',
    };
  }

  const separatorIndex = seed.indexOf(':');
  if (separatorIndex === -1) {
    return {
      created: false,
      message: 'ADMIN_SEED format invalid (expected email:password)',
    };
  }

  const email = seed.slice(0, separatorIndex).trim();
  const password = seed.slice(separatorIndex + 1);

  if (!email || !password || password.length < 8) {
    return {
      created: false,
      message: 'ADMIN_SEED email invalid or password shorter than 8 characters',
    };
  }

  const user = await createUser({ email, password, role: 'admin' });
  return {
    created: true,
    email: user.email,
    message: `Created admin user ${user.email}`,
  };
}
