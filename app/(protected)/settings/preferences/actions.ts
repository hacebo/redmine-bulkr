'use server';

import { getServerUser } from '@/lib/services/auth';
import { createSessionClient } from '@/lib/appwrite';
import { revalidatePath } from 'next/cache';

export interface TimeEntryPreferences {
  requireIssue: boolean;
}

export async function getTimeEntryPreferences(): Promise<TimeEntryPreferences> {
  const user = await getServerUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Default preferences
  const defaults: TimeEntryPreferences = {
    requireIssue: false,
  };

  try {
    // Get preferences from user.prefs
    const requireIssue = user.prefs?.requireIssue;
    
    return {
      requireIssue: typeof requireIssue === 'boolean' ? requireIssue : defaults.requireIssue,
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return defaults;
  }
}

export async function updateTimeEntryPreferences(preferences: TimeEntryPreferences) {
  try {
    const user = await getServerUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { account } = await createSessionClient();
    
    // Update user preferences in Appwrite
    await account.updatePrefs({
      ...user.prefs,
      requireIssue: preferences.requireIssue,
    });

    revalidatePath('/settings/preferences');
    
    return {
      success: true,
      message: 'Preferences saved successfully!'
    };
  } catch (error) {
    console.error('Error updating preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save preferences'
    };
  }
}

