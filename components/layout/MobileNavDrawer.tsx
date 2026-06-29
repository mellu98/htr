'use client';

/**
 * MobileNavDrawer — hamburger-opened left side panel containing ALL routes.
 *
 * Why this exists: the desktop TopBar nav is hidden below `lg` (1024px) and
 * the bottom nav only carries 5 routes. On phones, the remaining 7 routes
 * (Library, Review, AI Processing, AI Tutor, Notes, Artist Profile, Call Prep)
 * would otherwise be unreachable without manually typing the URL.
 *
 * Closes automatically on route change via a `usePathname` effect so users
 * don't have to manually dismiss it after tapping a link.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND, MOBILE_NAV_SECTIONS } from '@/lib/wave-up/brand';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null;
}

export function MobileNavDrawer({ open, onOpenChange, user }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

  // Close the drawer whenever the route changes, so the user lands cleanly
  // on the destination page without having to tap the overlay.
  React.useEffect(() => {
    if (open) onOpenChange(false);
    // We intentionally only react to pathname changes; onOpenChange is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filteredSections = isAdmin
    ? MOBILE_NAV_SECTIONS
    : MOBILE_NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.href !== '/ai' && item.href !== '/ai/tutor',
        ),
      })).filter((section) => section.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showClose={false}
        // pt accounts for the sticky TopBar so the header doesn't slide under it.
        className="flex w-[88vw] max-w-sm flex-col gap-0 p-0 pt-[var(--safe-top)]"
      >
        <SheetHeader className="border-b border-border/60 px-5 pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-lg shadow-primary/30">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <SheetTitle className="text-base font-semibold gradient-text">
                {BRAND.name}
              </SheetTitle>
              <SheetDescription className="text-[10px] uppercase tracking-[0.18em]">
                {BRAND.course.name} · Coach
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav
          aria-label="Mobile navigation"
          className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(1rem+var(--safe-bottom))]"
        >
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-5">
              <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname?.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        // min-h-[44px] = iOS HIG / WCAG minimum touch target.
                        // touch-manipulation = no 300ms tap delay.
                        className={cn(
                          'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium touch-manipulation transition-colors',
                          active
                            ? 'bg-gradient-to-r from-accent/15 to-primary/10 text-accent'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'h-1.5 w-1.5 rounded-full transition-colors',
                            active ? 'bg-accent shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-border',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/60 px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI Coach · 24/7</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}