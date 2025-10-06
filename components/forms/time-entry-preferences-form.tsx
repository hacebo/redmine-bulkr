"use client";
import { useTransition, useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getAppwriteJWT } from "@/lib/appwrite-jwt.client";
import { updatePrefsWithJWT, getTimeEntryPreferencesWithJWT } from '@/app/(protected)/settings/preferences/actions';
import { toast } from 'sonner';

export function TimeEntryPreferencesForm() {
  const [pending, start] = useTransition();
  const [requireIssue, setRequireIssue] = useState(true); // Default
  const [loading, setLoading] = useState(true);

  // Fetch preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const jwt = await getAppwriteJWT();
        const prefs = await getTimeEntryPreferencesWithJWT(jwt);
        setRequireIssue(prefs.requireIssue);
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(formData: FormData) {
    const prefs = { requireIssue: formData.get("requireIssue") === "on" };
    const jwt = await getAppwriteJWT();
    start(async () => {
      try {
        await updatePrefsWithJWT(jwt, prefs);
        toast.success('Preferences saved successfully!');
      } catch (error) {
        console.error('Error saving preferences:', error);
        toast.error('Failed to save preferences');
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
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
            name="requireIssue"
            checked={requireIssue}
            onCheckedChange={setRequireIssue}
            disabled={loading}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending || loading}>
        {loading ? "Loading..." : pending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}

