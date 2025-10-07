import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUserForPage } from '@/lib/auth.server';
import { getRedmineCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { getProjectsServerOnly, getActivitiesServerOnly } from '@/app/lib/actions/projects';
import { getMonthlyTimeEntriesServerOnly } from '@/app/lib/actions/time-entries';
import { BulkEntryClient } from '@/components/time-entry/bulk-entry-client';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { RedmineSetupEmptyState } from '@/components/shared/redmine-setup-empty-state';
import { format, startOfWeek, addDays } from 'date-fns';

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

  const dataPromise = Promise.all([
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
