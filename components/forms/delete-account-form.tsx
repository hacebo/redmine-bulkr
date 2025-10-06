"use client";

import { useState, useTransition } from 'react';
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
import { getAppwriteJWT } from "@/lib/appwrite-jwt.client";
import { toast } from 'sonner';

export function ClearAccountDataForm() {
  const [pending, start] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleClearAccountData() {
    const jwt = await getAppwriteJWT();
    start(async () => {
      try {
        const result = await clearAccountDataAction(jwt);
        
        if (result.success) {
          toast.success(result.message || 'Account data cleared successfully');
          // Redirect to login immediately after session is deleted
          router.push('/login');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to clear account data');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to clear account data';
        toast.error(errorMessage);
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          type="button" 
          variant="destructive" 
          className="w-full"
          disabled={pending}
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
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAccountData}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? 'Clearing Data...' : 'Yes, clear all data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
