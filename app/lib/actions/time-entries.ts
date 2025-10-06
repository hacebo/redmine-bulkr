'use server';

import { requireUserForServer } from '@/lib/auth.server';
import { getRedmineClientForUser, getRedmineUserId } from '../services/redmineClient';
import { z } from 'zod';
import { TimeEntry, WeeklyTimeData, RedmineTimeEntry, RedmineApiError, RedmineTimeEntryPayload } from '../types';

const bulkTimeEntrySchema = z.object({
  entries: z.array(z.object({
    projectId: z.number().min(1, 'Project is required'),
    issueId: z.number().optional(),
    activityId: z.number().min(1, 'Activity is required'),
    date: z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    hours: z.number().min(0, 'Hours must be positive').max(24, 'Hours cannot exceed 24 per day'),
    comments: z.string().optional(),
  })).min(1, 'At least one time entry is required'),
});

export async function createBulkTimeEntries(formData: FormData) {
  const user = await requireUserForServer();

  const rawData = {
    entries: JSON.parse(formData.get('entries') as string),
  };

  let validatedData;
  try {
    validatedData = bulkTimeEntrySchema.parse(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    }
    throw error;
  }

  try {
    // Create time entries directly in Redmine
    const redmineService = await getRedmineClientForUser();

    const results = [];
    for (const entry of validatedData.entries) {
      // Validate that issue belongs to the selected project (if issueId is provided)
      if (entry.issueId) {
        try {
          const issueData = await redmineService.getIssue(entry.issueId);
          const issue = issueData.issue;
          
          if (issue.project.id !== entry.projectId) {
            throw new Error(
              `Issue #${entry.issueId} belongs to project "${issue.project.name}", not the selected project. Please select a different issue.`
            );
          }
        } catch (error) {
          if (error instanceof RedmineApiError && error.code === 'NOT_FOUND') {
            throw new Error(`Issue #${entry.issueId} does not exist or you don't have permission to access it.`);
          }
          throw error;
        }
      }

      const redmineEntry: RedmineTimeEntryPayload = {
        time_entry: {
          project_id: entry.projectId,
          ...(entry.issueId && { issue_id: entry.issueId }),
          spent_on: entry.date,
          hours: entry.hours,
          activity_id: entry.activityId,
          comments: entry.comments || '',
        }
      };

      const result = await redmineService.createTimeEntry(redmineEntry);
      results.push(result);
    }

    // Invalidate time entries cache for this user
    const { revalidateTag } = await import('next/cache');
    revalidateTag(`time-entries:${user.userId}`);

    return { success: true, timeEntries: results };
  } catch (error) {
    console.error('Error creating bulk time entries:', error);
    
    if (error instanceof RedmineApiError) {
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Your Redmine API key is invalid or expired. Please log in again.');
      }
      if (error.code === 'VALIDATION_ERROR') {
        throw new Error(`Validation error: ${error.message}`);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Unable to connect to Redmine. Please check your internet connection and try again.');
      }
      throw new Error(`Redmine error: ${error.message}`);
    }
    
    throw new Error('Failed to create time entries. Please try again.');
  }
}

export async function getWeeklyTimeEntries(weekStart: string): Promise<WeeklyTimeData> {
  await requireUserForServer();

  try {
    // Get time entries from Redmine
    const redmineService = await getRedmineClientForUser();
    const redmineUserId = await getRedmineUserId();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const data = await redmineService.getTimeEntries(redmineUserId, weekStart, weekEndStr, 100);
    
    // Process the data to match our expected format
    const entries: TimeEntry[] = (data.time_entries || []).map((entry: RedmineTimeEntry) => ({
      id: entry.id,
      projectId: entry.project.id,
      issueId: entry.issue?.id,
      activityId: entry.activity.id,
      activityName: entry.activity.name,
      date: entry.spent_on,
      hours: entry.hours,
      comments: entry.comments,
      syncedToRedmine: true,
    }));

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    
    const byProject: Record<number, number> = {};
    const byActivity: Record<number, number> = {};
    
    entries.forEach((entry) => {
      byProject[entry.projectId] = (byProject[entry.projectId] || 0) + entry.hours;
      byActivity[entry.activityId] = (byActivity[entry.activityId] || 0) + entry.hours;
    });
    
    return {
      totalHours,
      entries,
      byProject,
      byActivity,
    };
  } catch (error) {
    console.error('Error fetching weekly time entries:', error);
    
    if (error instanceof RedmineApiError) {
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Your Redmine API key is invalid or expired. Please update your credentials in Settings → Redmine.');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Unable to connect to Redmine. Please check your internet connection and try again.');
      }
      throw new Error(`Redmine error: ${error.message}`);
    }
    
    // Pass through helpful error messages from getRedmineUserId
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to fetch time entries. Please try again.');
  }
}

// Server-side only version
export async function getMonthlyTimeEntriesServerOnly(monthStart: string, monthEnd: string): Promise<TimeEntry[]> {
  await requireUserForServer();

  try {
    const { getDecryptedRedmineCredentialsServer } = await import('@/lib/services/redmine-credentials-server');
    const credentials = await getDecryptedRedmineCredentialsServer();
    if (!credentials) {
      throw new Error('No Redmine credentials found');
    }

    const redmineService = new (await import('../services/redmine')).RedmineService(credentials.baseUrl, credentials.apiKey);
    const redmineUserId = parseInt(credentials.redmineUserId || '0');

    const data = await redmineService.getTimeEntries(redmineUserId, monthStart, monthEnd, 500);
    
    // Process the data to match our expected format
    const entries: TimeEntry[] = (data.time_entries || []).map((entry: RedmineTimeEntry) => ({
      id: entry.id,
      projectId: entry.project.id,
      issueId: entry.issue?.id,
      activityId: entry.activity.id,
      activityName: entry.activity.name,
      date: entry.spent_on,
      hours: entry.hours,
      comments: entry.comments,
      syncedToRedmine: true,
    }));

    return entries;
  } catch (error) {
    console.error('[getMonthlyTimeEntries] Error details:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof RedmineApiError) {
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Your Redmine API key is invalid or expired. Please update your credentials in Settings → Redmine.');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Unable to connect to Redmine. Please check your internet connection and try again.');
      }
      throw new Error(`Redmine error: ${error.message}`);
    }
    
    // Pass through helpful error messages from getRedmineUserId
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to fetch time entries. Please try again.');
  }
}

// Client-side version that requires JWT
export async function getMonthlyTimeEntries(monthStart: string, monthEnd: string): Promise<TimeEntry[]> {
  await requireUserForServer();

  try {
    // Get time entries from Redmine for the entire month
    const redmineService = await getRedmineClientForUser();
    const redmineUserId = await getRedmineUserId();

    const data = await redmineService.getTimeEntries(redmineUserId, monthStart, monthEnd, 500);
    
    // Process the data to match our expected format
    const entries: TimeEntry[] = (data.time_entries || []).map((entry: RedmineTimeEntry) => ({
      id: entry.id,
      projectId: entry.project.id,
      issueId: entry.issue?.id,
      activityId: entry.activity.id,
      activityName: entry.activity.name,
      date: entry.spent_on,
      hours: entry.hours,
      comments: entry.comments,
      syncedToRedmine: true,
    }));

    return entries;
  } catch (error) {
    console.error('[getMonthlyTimeEntries] Error details:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof RedmineApiError) {
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Your Redmine API key is invalid or expired. Please update your credentials in Settings → Redmine.');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Unable to connect to Redmine. Please check your internet connection and try again.');
      }
      throw new Error(`Redmine error: ${error.message}`);
    }
    
    // Pass through helpful error messages from getRedmineUserId
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to fetch time entries. Please try again.');
  }
}

export async function syncToRedmine() {
  await requireUserForServer();

  // Since we're working directly with Redmine, no sync is needed
  // This function is kept for compatibility but doesn't need to do anything
  return { success: true, message: 'All entries are already synced with Redmine' };
}
