import { getCurrentUser } from '@/lib/currentUser';
import { redirect } from 'next/navigation';
import { DashboardServer } from '@/components/dashboard/dashboard-server';
import { Suspense } from 'react';
import { DashboardLoadingSkeleton } from '@/components/shared/loading-skeletons';
import { db } from '@/lib/db';
import { redmineCredentials, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

interface TimeTrackingPageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function TimeTrackingPage({ searchParams }: TimeTrackingPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || null,
    });
  }

  const credRows = await db
    .select()
    .from(redmineCredentials)
    .where(eq(redmineCredentials.userId, user.id))
    .limit(1);

  if (credRows.length === 0) {
    redirect('/settings/redmine');
  }

  const params = await searchParams;
  const projectId = params.projectId ? parseInt(params.projectId) : undefined;

  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardServer currentMonth={new Date()} initialProjectId={projectId} />
    </Suspense>
  );
}
