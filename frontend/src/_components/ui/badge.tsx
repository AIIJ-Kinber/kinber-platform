import * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
