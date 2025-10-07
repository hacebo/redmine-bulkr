'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testRedmineConnectionAction } from '@/app/(protected)/settings/redmine/actions';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

export function TestConnectionForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleTestConnection() {
    setIsLoading(true);
    
    try {
      const result = await testRedmineConnectionAction();
      
      if (result.success) {
        console.info('Redmine connection test successful');
        toast.success(result.message || 'Connection test successful!');
      } else {
        console.warn('Redmine connection test failed', { error: result.error });
        toast.error(result.error || 'Connection test failed');
      }
    } catch (error: unknown) {
      Sentry.captureException(error, {
        tags: {
          component: 'test-connection-form',
          errorType: 'connection_test_exception',
        },
      });
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button 
      type="button" 
      variant="outline" 
      className="w-full" 
      onClick={handleTestConnection}
      disabled={isLoading}
    >
      {isLoading ? 'Testing...' : 'Test Redmine Connection'}
    </Button>
  );
}
