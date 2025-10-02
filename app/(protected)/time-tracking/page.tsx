import { getServerUser } from '@/lib/services/auth';
import { redirect } from 'next/navigation';
import { MainDashboard } from '@/components/dashboard/main-dashboard';
import { Suspense } from 'react';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { getRedmineCredentials } from '@/lib/services/redmine-credentials';
import { getProjects, getActivities } from '@/app/lib/actions/projects';

interface TimeTrackingPageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function TimeTrackingPage({ searchParams }: TimeTrackingPageProps) {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user has Redmine credentials configured
  const credentials = await getRedmineCredentials();
  if (!credentials) {
    redirect('/settings/redmine');
  }

  const params = await searchParams;
  const projectId = params.projectId ? parseInt(params.projectId) : undefined;

  // Fetch data directly in the page (React 19 pattern)
  const dataPromise = Promise.all([
    getProjects(),
    getActivities()
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
