'use server';

import { Issue, Project, Activity, RedmineProject, RedmineActivity, RedmineIssue } from '../types';
import { CACHE_CONFIG } from '../cache';
import { createCachedRedmineCall } from '../services/cached-redmine-service';

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
