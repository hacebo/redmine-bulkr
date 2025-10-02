'use server';

import { getServerUser } from '@/lib/services/auth';
import { getDecryptedRedmineCredentials } from '@/lib/services/redmine-credentials';
import { Project, Activity, RedmineProject, RedmineActivity } from '../types';
import { createUserScopedCache, CACHE_CONFIG } from '../cache';
import { RedmineService } from '../services/redmine';

// Public API: Server actions that can be called from Server Components or Client Components
export async function getProjects(): Promise<Project[]> {
  const user = await getServerUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const credentials = await getDecryptedRedmineCredentials();
  if (!credentials) {
    throw new Error('No Redmine credentials found');
  }

  try {
    // Create a closure that captures credentials but doesn't expose them in cache key
    const fetchProjectsRaw = async () => {
      const client = new RedmineService(credentials.baseUrl, credentials.apiKey);
      const data = await client.getProjects();
      
      return data.projects.map((project: RedmineProject) => ({
        id: project.id,
        name: project.name,
        identifier: project.identifier,
      }));
    };

    // Create cached version with user-scoped key
    const getProjectsCached = createUserScopedCache(
      fetchProjectsRaw,
      'projects',
      { userId: user.$id, baseUrl: credentials.baseUrl },
      {
        revalidate: CACHE_CONFIG.PROJECTS.revalidate,
        tagPrefix: CACHE_CONFIG.PROJECTS.tagPrefix,
      }
    );

    return await getProjectsCached();
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects. Please try again.');
  }
}

export async function getActivities(): Promise<Activity[]> {
  const user = await getServerUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const credentials = await getDecryptedRedmineCredentials();
  if (!credentials) {
    throw new Error('No Redmine credentials found');
  }

  try {
    // Create a closure that captures credentials but doesn't expose them in cache key
    const fetchActivitiesRaw = async () => {
      const client = new RedmineService(credentials.baseUrl, credentials.apiKey);
      const data = await client.getActivities();
      
      return data.time_entry_activities.map((activity: RedmineActivity) => ({
        id: activity.id,
        name: activity.name,
        is_default: activity.is_default,
      }));
    };

    // Create cached version with user-scoped key
    const getActivitiesCached = createUserScopedCache(
      fetchActivitiesRaw,
      'activities',
      { userId: user.$id, baseUrl: credentials.baseUrl },
      {
        revalidate: CACHE_CONFIG.ACTIVITIES.revalidate,
        tagPrefix: CACHE_CONFIG.ACTIVITIES.tagPrefix,
      }
    );

    return await getActivitiesCached();
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw new Error('Failed to fetch activities. Please try again.');
  }
}
