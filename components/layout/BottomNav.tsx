'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, CheckSquare, Disc3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
  { href: '/releases', label: 'Releases', icon: Disc3 },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/manager', label: 'Manager', icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    // pb-[var(--safe-bottom)] leaves room for the iOS home indicator.
    // The container is hidden on md+ so it never collides with desktop layout.
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-[var(--safe-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                // min-h-[44px] + touch-manipulation: WCAG 2.5.5 / iOS HIG minimum
                // tap target. Removes the 300ms tap delay on mobile browsers.
                className={cn(
                  'flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] touch-manipulation transition-colors',
                  active
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    active && 'scale-110 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]',
                  )}
                />
                <span className="font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}