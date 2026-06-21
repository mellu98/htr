'use client';

/**
 * ServiceWorkerRegistrar
 *
 * One-shot client component that registers /sw.js exactly once per page
 * load. Lives in the root layout so every route is covered.
 *
 * Why a dedicated component instead of a <Script strategy="afterInteractive">:
 *   - We need it to run only on the client (SW API doesn't exist on the
 *     server) and a client component does that automatically.
 *   - We get hot-reload-friendly behavior in dev (SW disabled in dev to
 *     avoid stale shell surprises).
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    // /sw.js is served from /public so it's at the site root.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // SW registration failures are non-fatal — the app still works
        // online. Just log so we can debug from the console.
        console.warn('[PWA] service worker registration failed:', err);
      });
  }, []);

  return null;
}
