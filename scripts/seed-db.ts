/**
 * Bootstrap script — ensures the singleton AppSettings row exists.
 *
 *   npm run db:push   # creates schema
 *   npm run db:seed   # seeds singleton settings
 *
 * The script is idempotent: re-running it is safe.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.appSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!existing) {
    await prisma.appSettings.create({
      data: { id: 'singleton', theme: 'dark' },
    });
    console.log('✓ Created AppSettings singleton (theme=dark)');
  } else {
    console.log('✓ AppSettings singleton already present');
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
