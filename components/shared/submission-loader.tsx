'use client';

import { Loader2 } from 'lucide-react';

interface SubmissionLoaderProps {
  isSubmitting: boolean;
  message?: string;
}

export function SubmissionLoader({ isSubmitting, message = 'Submitting...' }: SubmissionLoaderProps) {
  if (!isSubmitting) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-label="Loading"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
}

