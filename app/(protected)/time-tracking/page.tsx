import { requireUserForPage } from '@/lib/auth.server';
import { redirect } from 'next/navigation';
import { MainDashboard } from '@/components/dashboard/main-dashboard';
import { Suspense } from 'react';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { getRedmineCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { getProjectsServerOnly, getActivitiesServerOnly } from '@/app/lib/actions/projects';
import { RedmineSetupEmptyState } from '@/components/shared/redmine-setup-empty-state';

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
  const dataPromise = Promise.all([
    getProjectsServerOnly(),
    getActivitiesServerOnly()
  ]).then(([projects, activities]) => ({
    projects,
    activities
  }));

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
