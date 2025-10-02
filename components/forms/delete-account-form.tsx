'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { clearAccountDataAction } from '@/app/(protected)/settings/account/actions';
import { toast } from 'sonner';

export function ClearAccountDataForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClearAccountData() {
    setIsLoading(true);
    
    try {
      const result = await clearAccountDataAction();
      
      if (result.success) {
        toast.success(result.message || 'Account data cleared successfully');
        // Redirect to login immediately after session is deleted
        router.push('/login');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to clear account data');
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear account data');
      setIsLoading(false);
    }
  }

  return (
    <Button 
      type="button" 
      variant="destructive" 
      className="w-full" 
      onClick={handleClearAccountData}
      disabled={isLoading}
    >
      {isLoading ? 'Clearing Data...' : 'Clear All Data and Logout'}
    </Button>
  );
}
