'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message: string;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, className, icon }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-20 bg-muted/10 rounded-xl border-2 border-dashed gap-4 text-center px-4",
      className
    )}>
      {icon || <Layers className="h-10 w-10 text-muted-foreground/30" />}
      <p className="text-muted-foreground font-medium max-w-[280px]">{message}</p>
    </div>
  );
}
