'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { clearAccountDataAction } from '@/app/(protected)/settings/account/actions';
import { toast } from 'sonner';

export function ClearAccountDataForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear account data';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          type="button" 
          variant="destructive" 
          className="w-full"
          disabled={isLoading}
        >
          Clear All Data and Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete all your Redmine credentials and log you out. 
            You will need to set up your Redmine connection again after logging back in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAccountData}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Clearing Data...' : 'Yes, clear all data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
