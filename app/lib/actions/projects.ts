'use server';

import { getCurrentUser } from '@/lib/currentUser';
import { getRedmineClientForUser } from '../services/redmineClient';
import { Project, Activity, RedmineProject, RedmineActivity } from '../types';
import { cachedFn, CACHE_CONFIG } from '../cache';

export async function getProjects(): Promise<Project[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create cached function with user-specific key
  const getCachedProjects = cachedFn(
    async () => {
      try {
        const { client: redmineService } = await getRedmineClientForUser(user.id);

        const data = await redmineService.getProjects();
        return data.projects.map((project: RedmineProject) => ({
          id: project.id,
          name: project.name,
          identifier: project.identifier,
        }));
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new Error('Failed to fetch projects. Please try again.');
      }
    },
    ['projects', user.id],
    {
      revalidate: CACHE_CONFIG.PROJECTS.revalidate,
      tags: [...CACHE_CONFIG.PROJECTS.tags, `user-${user.id}`],
    }
  );

  return getCachedProjects();
}

export async function getActivities(): Promise<Activity[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create cached function with user-specific key
  const getCachedActivities = cachedFn(
    async () => {
      try {
        const { client: redmineService } = await getRedmineClientForUser(user.id);

        const data = await redmineService.getActivities();
        return data.time_entry_activities.map((activity: RedmineActivity) => ({
          id: activity.id,
          name: activity.name,
          is_default: activity.is_default,
        }));
      } catch (error) {
        console.error('Error fetching activities:', error);
        throw new Error('Failed to fetch activities. Please try again.');
      }
    },
    ['activities', user.id],
    {
      revalidate: CACHE_CONFIG.ACTIVITIES.revalidate,
      tags: [...CACHE_CONFIG.ACTIVITIES.tags, `user-${user.id}`],
    }
  );

  return getCachedActivities();
}
