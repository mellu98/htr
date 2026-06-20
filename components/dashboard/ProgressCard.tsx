import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressCardProps {
  title: string;
  description?: string;
  value: number; // 0..100
  className?: string;
  meta?: React.ReactNode;
}

export function ProgressCard({
  title,
  description,
  value,
  className,
  meta,
}: ProgressCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="font-mono text-2xl font-semibold gradient-text">
            {Math.round(value)}%
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Progress
          value={value}
          className="h-2"
          indicatorClassName="bg-gradient-brand"
        />
        {meta && <div className="mt-3 text-xs text-muted-foreground">{meta}</div>}
      </CardContent>
    </Card>
  );
}
