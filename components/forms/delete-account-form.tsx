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
import { deleteRedmineCredentialsAction } from '@/app/(protected)/settings/redmine/actions';
import { getAppwriteJWT } from "@/lib/appwrite-jwt.client";
import { toast } from 'sonner';

export function DeleteRedmineCredentialsForm() {
  const [pending, start] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleDeleteCredentials() {
    const jwt = await getAppwriteJWT();
    start(async () => {
      try {
        const result = await deleteRedmineCredentialsAction(jwt);
        
        if (result.success) {
          toast.success(result.message || 'Redmine credentials deleted successfully');
          setIsOpen(false);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to delete credentials');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete credentials';
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
          Delete Redmine Credentials
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Redmine credentials?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div className="font-semibold text-foreground">
                This will permanently delete your stored Redmine credentials:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your encrypted Redmine API key will be removed</li>
                <li>Your Redmine URL configuration will be deleted</li>
                <li>You will need to reconnect to use time tracking features</li>
              </ul>
              <div className="pt-2 font-semibold text-green-600 dark:text-green-400">
                Your Redmine data is safe: All time entries and your Redmine account remain unchanged.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCredentials}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? 'Deleting...' : 'Yes, delete credentials'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
