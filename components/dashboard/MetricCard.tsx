import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'cyan' | 'violet' | 'blue' | 'success';
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'from-white/5 to-white/0',
  cyan: 'from-cyan-500/10 to-cyan-500/0',
  violet: 'from-violet-500/10 to-violet-500/0',
  blue: 'from-blue-500/10 to-blue-500/0',
  success: 'from-emerald-500/10 to-emerald-500/0',
};

const TONE_ICON: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-muted-foreground',
  cyan: 'text-cyan-400',
  violet: 'text-violet-400',
  blue: 'text-blue-400',
  success: 'text-emerald-400',
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br',
          TONE_CLASSES[tone],
        )}
      />
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border',
            TONE_ICON[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
