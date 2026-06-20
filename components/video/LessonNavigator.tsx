'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/lib/types';
import type { LessonRuntimeStatus } from '@/lib/types';

interface LessonNavigatorProps {
  groups: {
    module: { id: string; title: string; order: number };
    lessons: Lesson[];
  }[];
  activeSlug: string;
  statuses: Record<string, LessonRuntimeStatus | undefined>;
}

export function LessonNavigator({ groups, activeSlug, statuses }: LessonNavigatorProps) {
  return (
    // max-h-[60vh] keeps the panel bounded when used inside the mobile <details>
    // accordion on the lesson page — otherwise the panel would push content off
    // the viewport on short phones.
    <aside className="h-full max-h-[60vh] overflow-y-auto rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
      <div className="border-b border-border/60 p-4">
        <h3 className="text-sm font-semibold tracking-tight">Lezioni</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {groups.reduce((acc, g) => acc + g.lessons.length, 0)} totali
        </p>
      </div>
      <nav className="p-2">
        {groups.map((group) => (
          <ModuleGroup
            key={group.module.id}
            group={group}
            activeSlug={activeSlug}
            statuses={statuses}
          />
        ))}
      </nav>
    </aside>
  );
}

function ModuleGroup({
  group,
  activeSlug,
  statuses,
}: {
  group: {
    module: { id: string; title: string; order: number };
    lessons: Lesson[];
  };
  activeSlug: string;
  statuses: Record<string, LessonRuntimeStatus | undefined>;
}) {
  // First group is open by default; others collapsed.
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // min-h-[40px] gives the collapse toggle a comfortable tap target —
        // headers are less critical than the lesson links below.
        className="flex w-full min-h-[40px] items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground touch-manipulation transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <span className="truncate">{group.module.title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {group.lessons.map((lesson) => {
            const status = statuses[lesson.slug];
            const isActive = lesson.slug === activeSlug;
            return (
              <li key={lesson.id}>
                <Link
                  href={`/lesson/${lesson.slug}`}
                  // min-h-[44px] = iOS HIG / WCAG minimum touch target.
                  className={cn(
                    'group flex min-h-[44px] items-start gap-2 rounded-md px-3 py-2.5 text-xs touch-manipulation transition-colors',
                    isActive
                      ? 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/40'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <StatusIcon
                    present={status?.videoPresent ?? false}
                    completed={status?.progress.completed ?? false}
                    applied={status?.progress.applied ?? false}
                    active={isActive}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{lesson.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/80">
                      {lesson.duration}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({
  present,
  completed,
  applied,
  active,
}: {
  present: boolean;
  completed: boolean;
  applied: boolean;
  active: boolean;
}) {
  if (!present) {
    return <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (applied) {
    return (
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-gradient-brand">
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (completed) {
    return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={3} />;
  }
  return (
    <Circle
      className={cn(
        'mt-0.5 h-3.5 w-3.5 shrink-0',
        active ? 'text-accent' : 'text-muted-foreground/60',
      )}
    />
  );
}
