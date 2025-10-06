'use server';

import { Issue, Project, Activity, RedmineProject, RedmineActivity, RedmineIssue } from '../types';
import { CACHE_CONFIG } from '../cache';
import { createCachedRedmineCall } from '../services/cached-redmine-service';
import { getDecryptedRedmineCredentialsServer } from '@/lib/services/redmine-credentials-server';
import { RedmineService } from '../services/redmine';

// Server-side only version that works with our cookie auth
export async function getProjectsServerOnly(): Promise<Project[]> {
  const credentials = await getDecryptedRedmineCredentialsServer();
  if (!credentials) {
    throw new Error('No Redmine credentials found');
  }

  const service = new RedmineService(credentials.baseUrl, credentials.apiKey);
  const data = await service.getProjects();
  
  return (data.projects || []).map((project: RedmineProject) => ({
    id: project.id,
    name: project.name,
    identifier: project.identifier,
  }));
}

// Client-side version that requires JWT
export async function getProjects(): Promise<Project[]> {
  return createCachedRedmineCall(
    'projects',
    async (service) => {
      const data = await service.getProjects();
      return (data.projects || []).map((project: RedmineProject) => ({
        id: project.id,
        name: project.name,
        identifier: project.identifier,
      }));
    },
    {
      revalidate: CACHE_CONFIG.PROJECTS.revalidate,
      tagPrefix: CACHE_CONFIG.PROJECTS.tagPrefix,
    }
  );
}

// Server-side only version
export async function getActivitiesServerOnly(): Promise<Activity[]> {
  const credentials = await getDecryptedRedmineCredentialsServer();
  if (!credentials) {
    throw new Error('No Redmine credentials found');
  }

  const service = new RedmineService(credentials.baseUrl, credentials.apiKey);
  const data = await service.getActivities();
  
  return (data.time_entry_activities || []).map((activity: RedmineActivity) => ({
    id: activity.id,
    name: activity.name,
    is_default: activity.is_default || false,
  }));
}

// Client-side version that requires JWT
export async function getActivities(): Promise<Activity[]> {
  return createCachedRedmineCall(
    'activities',
    async (service) => {
      const data = await service.getActivities();
      return (data.time_entry_activities || []).map((activity: RedmineActivity) => ({
        id: activity.id,
        name: activity.name,
        is_default: activity.is_default || false,
      }));
    },
    {
      revalidate: CACHE_CONFIG.ACTIVITIES.revalidate,
      tagPrefix: CACHE_CONFIG.ACTIVITIES.tagPrefix,
    }
  );
}

export async function getProjectIssues(projectId: number): Promise<Issue[]> {
  return createCachedRedmineCall(
    `issues-${projectId}`,
    async (service) => {
      const data = await service.getIssues(projectId);
      return (data.issues || []).map((issue: RedmineIssue) => ({
        id: issue.id,
        subject: issue.subject,
        project: issue.project,
        tracker: issue.tracker,
        status: issue.status,
        priority: issue.priority,
      }));
    },
    {
      revalidate: CACHE_CONFIG.ISSUES.revalidate,
      tagPrefix: CACHE_CONFIG.ISSUES.tagPrefix,
    }
  );
}
