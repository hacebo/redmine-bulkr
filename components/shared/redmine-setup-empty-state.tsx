'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface RedmineSetupEmptyStateProps {
  feature: 'Time Tracking' | 'Bulk Entry';
}

export function RedmineSetupEmptyState({ feature }: RedmineSetupEmptyStateProps) {
  const router = useRouter();
  const hasShownToast = useRef(false);
  
  useEffect(() => {
    // Only show toast once (prevents duplicate in React Strict Mode)
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast.info(
        `Configure your Redmine connection to start using ${feature}`,
        { duration: 6000 }
      );
    }
  }, [feature]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Redmine Setup Required</CardTitle>
          <CardDescription>
            Connect your Redmine instance to start tracking time with {feature}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>To get started, you&apos;ll need:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your Redmine instance URL</li>
              <li>Your Redmine API key</li>
            </ul>
          </div>
          <Button 
            className="w-full" 
            onClick={() => router.push('/settings/redmine')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Redmine
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

