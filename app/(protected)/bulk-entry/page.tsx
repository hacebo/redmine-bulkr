import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUserForPage } from '@/lib/auth.server';
import { getRedmineCredentialsServer, deleteCorruptedCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { getProjectsServerOnly, getActivitiesServerOnly } from '@/app/lib/actions/projects';
import { getMonthlyTimeEntriesServerOnly } from '@/app/lib/actions/time-entries';
import { BulkEntryClient } from '@/components/time-entry/bulk-entry-client';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { RedmineSetupEmptyState } from '@/components/shared/redmine-setup-empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { logError } from '@/lib/sentry';

interface BulkEntryPageProps {
  searchParams: Promise<{
    projectId?: string;
    weekStart?: string;
  }>;
}

export default async function BulkEntryPage({ searchParams }: BulkEntryPageProps) {
  try {
    await requireUserForPage();
  } catch {
    redirect('/login');
  }

  // Check if user has Redmine credentials configured
  const credentials = await getRedmineCredentialsServer();
  if (!credentials) {
    console.warn('Bulk entry accessed without Redmine credentials - showing setup prompt');
    return <RedmineSetupEmptyState feature="Bulk Entry" />;
  }

  const params = await searchParams;

  const requestedDate = params.weekStart 
    ? new Date(params.weekStart)
    : new Date();
  
  const weekStart = startOfWeek(requestedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 13);
  
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Create promise for parallel data fetching
  // Wrap in try/catch to handle decryption errors
  let dataPromise;
  try {
    dataPromise = Promise.all([
      getProjectsServerOnly(),
      getActivitiesServerOnly(),
      getMonthlyTimeEntriesServerOnly(weekStartStr, weekEndStr).catch(() => [])
    ]).then(([projects, activities, timeEntries]) => {
      const selectedProject = params.projectId
        ? projects.find(p => p.id === parseInt(params.projectId || '0'))
        : projects[0];

      return {
        projects,
        activities,
        timeEntries,
        selectedProject: selectedProject || projects[0]
      };
    });

    // Test if the promise resolves (triggers decryption)
    await dataPromise;
  } catch (error) {
    // Check if it's a decryption error
    if (error instanceof Error && error.message === 'CREDENTIALS_DECRYPTION_FAILED') {
      console.warn('Credentials decryption failed - deleting corrupted data');
      logError(new Error('Credentials decryption failed in bulk-entry page'), {
        level: 'warning',
        tags: {
          page: 'bulk-entry',
          errorType: 'credentials_decryption_failed',
        },
        extra: {
          action: 'deleted_corrupted_credentials',
        },
      });
      await deleteCorruptedCredentialsServer();
      
      return (
        <div className="container mx-auto p-4 max-w-2xl">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Credentials Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>
                Your stored credentials could not be decrypted. This may happen if:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>The encryption key was changed</li>
                <li>The stored data became corrupted</li>
              </ul>
              <div className="font-semibold">
                Your corrupted credentials have been automatically removed. Please set up your Redmine connection again.
              </div>
            </AlertDescription>
          </Alert>
          <RedmineSetupEmptyState feature="Bulk Entry" />
        </div>
      );
    }
    
    // Re-throw other errors
    throw error;
  }

  return (
    <Suspense fallback={<DashboardLoadingSkeleton />} key={weekStartStr}>
      <BulkEntryClient
        key={weekStartStr}
        dataPromise={dataPromise}
        initialWeekStart={weekStartStr}
      />
    </Suspense>
  );
}
