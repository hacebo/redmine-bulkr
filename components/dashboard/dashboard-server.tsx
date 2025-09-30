import { getProjects, getActivities } from '@/app/lib/actions/projects';
import { MainDashboard } from '@/components/dashboard/main-dashboard';

interface DashboardServerProps {
  currentMonth: Date;
  initialProjectId?: number;
}

export function DashboardServer({ currentMonth, initialProjectId }: DashboardServerProps) {
  // Create promise for parallel data fetching (React 19 pattern)
  const dataPromise = Promise.all([
    getProjects(),
    getActivities()
  ]).then(([projects, activities]) => ({
    projects,
    activities
  }));

  return (
    <MainDashboard 
      dataPromise={dataPromise}
      currentMonth={currentMonth}
      initialProjectId={initialProjectId}
    />
  );
}
