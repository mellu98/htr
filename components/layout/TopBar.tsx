'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, ChevronDown, Menu, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { BRAND, NAV_LINKS } from '@/lib/wave-up/brand';
import { MobileNavDrawer } from './MobileNavDrawer';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export function TopBar() {
  const pathname = usePathname();
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? (res.json() as Promise<{ user: AuthUser }>) : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // Mobile drawer open state — owned here so the hamburger button (left) and
  // the SheetContent can share it without prop drilling through Shell.
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  return (
    <>
      <header
        // pt-[var(--safe-top)] keeps the bar clear of the iOS notch / status bar
        // when used with viewport-fit=cover.
        className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl pt-[var(--safe-top)]"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            {/*
              Hamburger — visible only below lg. On desktop the TopBar inline nav
              takes over and the hamburger is hidden to avoid duplication.
            */}
            <button
              type="button"
              aria-label="Apri menu di navigazione"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground touch-manipulation lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-gradient-brand opacity-70 blur-md transition-opacity group-hover:opacity-100" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-lg shadow-primary/30">
                  <Brain className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold tracking-tight gradient-text">
                  {BRAND.name}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {BRAND.course.name} · Coach
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.main.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <ContentDropdown pathname={pathname ?? '/'} user={user} />
          </nav>

          <div className="flex items-center gap-2">
            <Badge variant="violet" className="hidden gap-1 md:inline-flex">
              AI Coach · 24/7
            </Badge>
            {user && <UserDropdown user={user} />}
          </div>
        </div>
      </header>
      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} user={user} />
    </>
  );
}

function UserDropdown({ user }: { user: AuthUser }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="flex h-10 items-center gap-2 rounded-md border border-border/60 bg-card/70 px-3 text-sm font-medium text-foreground backdrop-blur-xl transition-colors hover:bg-accent/10 hover:text-accent"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="hidden max-w-[10rem] truncate sm:inline">
            {user.name ?? user.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[12rem] rounded-lg border border-border/60 bg-card p-1.5 shadow-2xl shadow-black/40"
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium text-foreground">
              {user.name ?? user.email}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-accent">
              {user.role}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
          <DropdownMenu.Item asChild>
            <LogoutButton
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ContentDropdown({ pathname, user }: { pathname: string; user: AuthUser | null }) {
  // AI Processing is an admin-only tool; hide it from regular users.
  const contentLinks =
    user?.role === 'admin'
      ? NAV_LINKS.content
      : NAV_LINKS.content.filter((item) => item.href !== '/ai');

  if (contentLinks.length === 0) return null;

  return (
    <details className="relative">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          pathname.startsWith('/library') ||
            pathname.startsWith('/review') ||
            pathname.startsWith('/ai') ||
            pathname.startsWith('/notes') ||
            pathname.startsWith('/artist-profile')
            ? 'bg-accent/15 text-accent'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
      >
        Content
        <ChevronDown className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border/60 bg-card p-2 shadow-2xl shadow-black/40">
        {contentLinks.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
