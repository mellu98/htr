'use client';

/**
 * PWAInstallPrompt
 *
 * Surfaces a dismissable install banner when the browser fires
 * `beforeinstallprompt` (Android / Desktop Chrome / Edge / Samsung Internet).
 * On iOS Safari the API doesn't exist, so we show a small tooltip with
 * the "Share → Add to Home Screen" instructions.
 *
 * UX rules:
 *   - NEVER auto-prompt. Only show after a small delay so it doesn't fight
 *     with the first-paint hero.
 *   - Once dismissed, never re-show for this user (localStorage).
 *   - Must be keyboard-accessible (focusable Install + Dismiss buttons).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'wave-up:pwa-install-dismissed-v1';
// 30 days before we re-prompt even if not installed.
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS (no beforeinstallprompt support — show tip instead).
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    setIsIos(ios);

    // If the app is already running in standalone mode, don't prompt.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS-specific
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    // Respect previous dismissals.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) return;
      }
    } catch {
      // localStorage blocked — fall through and show.
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Small delay so the banner doesn't compete with the hero animation.
      window.setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If the user accepts the install, the app fires `appinstalled`.
    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // iOS guidance: show after a short delay (independent of beforeinstallprompt).
  useEffect(() => {
    if (!isIos || installed) return;
    const dismissed = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    if (dismissed) {
      const ts = Number(dismissed);
      if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) return;
    }
    const t = window.setTimeout(() => setVisible(true), 4000);
    return () => window.clearTimeout(t);
  }, [isIos, installed]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
    } catch {
      /* user cancelled */
    } finally {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  }

  if (installed || !visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Installa Wave Up"
      className={cn(
        'fixed inset-x-3 bottom-[calc(5.5rem+var(--safe-bottom))] z-50 md:bottom-6',
        'mx-auto max-w-md rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl',
        'animate-fade-in',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-lg shadow-primary/30">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            Installa Wave Up
          </p>
          {isIos ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tocca{' '}
              <Share2 className="inline h-3 w-3 align-[-2px] text-accent" />{' '}
              <span className="font-medium text-foreground">Condividi</span> e
              poi{' '}
              <span className="font-medium text-foreground">
                Aggiungi a Home
              </span>
              . L'app funziona anche offline.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Apri Wave Up come un'app nativa, con icona sulla home e accesso
              offline alle lezioni già aperte.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground touch-manipulation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={dismiss} className="text-xs">
          Non ora
        </Button>
        {!isIos && deferred ? (
          <Button size="sm" variant="gradient" onClick={install} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Installa
          </Button>
        ) : (
          <Button asChild size="sm" variant="gradient" className="gap-1.5 text-xs">
            <Link href="/library">Apri libreria</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
