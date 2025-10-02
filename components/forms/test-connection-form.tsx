'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testRedmineConnectionAction } from '@/app/(protected)/settings/redmine/actions';
import { toast } from 'sonner';

export function TestConnectionForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleTestConnection() {
    setIsLoading(true);
    
    try {
      const result = await testRedmineConnectionAction();
      
      if (result.success) {
        toast.success(result.message || 'Connection test successful!');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
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
