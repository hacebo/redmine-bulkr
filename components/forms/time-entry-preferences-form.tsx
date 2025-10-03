'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { updateTimeEntryPreferences, TimeEntryPreferences } from '@/app/(protected)/settings/preferences/actions';

interface TimeEntryPreferencesFormProps {
  initialPreferences: TimeEntryPreferences;
}

export function TimeEntryPreferencesForm({ initialPreferences }: TimeEntryPreferencesFormProps) {
  const [requireIssue, setRequireIssue] = useState(initialPreferences.requireIssue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateTimeEntryPreferences({ requireIssue });
      
      if (result.success) {
        toast.success(result.message || 'Preferences saved!');
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="requireIssue">Require Issue for Time Entries</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, all time entries must be associated with a specific issue. 
              When disabled, you can create project-level time entries.
            </p>
          </div>
          <Switch
            id="requireIssue"
            checked={requireIssue}
            onCheckedChange={setRequireIssue}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Preferences'}
      </Button>
    </form>
  );
}

