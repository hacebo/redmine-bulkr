import { requireUserForPage } from '@/lib/auth.server';
import { redirect } from 'next/navigation';
import { MainDashboard } from '@/components/dashboard/main-dashboard';
import { Suspense } from 'react';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { getRedmineCredentialsServer, deleteCorruptedCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { getProjectsServerOnly, getActivitiesServerOnly } from '@/app/lib/actions/projects';
import { RedmineSetupEmptyState } from '@/components/shared/redmine-setup-empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface TimeTrackingPageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function TimeTrackingPage({ searchParams }: TimeTrackingPageProps) {
  try {
    await requireUserForPage();
  } catch {
    redirect('/login');
  }

  // Check if user has Redmine credentials configured
  const credentials = await getRedmineCredentialsServer();
  if (!credentials) {
    console.warn('Time tracking accessed without Redmine credentials - showing setup prompt');
    return <RedmineSetupEmptyState feature="Time Tracking" />;
  }

  const params = await searchParams;
  const projectId = params.projectId ? parseInt(params.projectId) : undefined;

  // Fetch data directly in the page (React 19 pattern)
  // Wrap in try/catch to handle decryption errors
  let dataPromise;
  try {
    dataPromise = Promise.all([
      getProjectsServerOnly(),
      getActivitiesServerOnly()
    ]).then(([projects, activities]) => ({
      projects,
      activities
    }));
    
    // Test if the promise resolves (triggers decryption)
    await dataPromise;
  } catch (error) {
    // Check if it's a decryption error
    if (error instanceof Error && error.message === 'CREDENTIALS_DECRYPTION_FAILED') {
      console.warn('Credentials decryption failed - deleting corrupted data');
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
          <RedmineSetupEmptyState feature="Time Tracking" />
        </div>
      );
    }
    
    // Re-throw other errors
    throw error;
  }

  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <MainDashboard 
        dataPromise={dataPromise}
        currentMonth={new Date()}
        initialProjectId={projectId}
      />
    </Suspense>
  );
}
