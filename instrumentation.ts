import { ensureAdminUser } from '@/lib/auth/user';

/**
 * Server startup hook.
 *
 * Next.js runs `register()` once when the production server starts. We use it
 * to idempotently create the first admin user from ADMIN_SEED if the database
 * is still empty. This avoids the need for a manual curl to /api/admin/seed on
 * first deploy.
 */
export async function register() {
  try {
    const result = await ensureAdminUser();
    console.log(`[instrumentation] ${result.message}`);
  } catch (error) {
    // Never crash the server because of a seed issue; log it loudly instead.
    console.error('[instrumentation] Failed to ensure admin user:', error);
  }
}
