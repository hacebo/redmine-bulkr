'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createBulkTimeEntries } from '@/app/lib/actions/time-entries';
import { getProjectIssues } from '@/app/lib/actions/projects';
import { getTimeEntryPreferencesWithJWT } from '@/app/(protected)/settings/preferences/actions';
import { getAppwriteJWT } from '@/lib/appwrite-jwt.client';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { validateTimeEntries } from '@/app/lib/utils/time-entry-validations';

interface Project {
  id: number;
  name: string;
  identifier: string;
}

interface Activity {
  id: number;
  name: string;
  is_default: boolean;
}

interface Issue {
  id: number;
  subject: string;
  tracker: { id: number; name: string };
  status: { id: number; name: string };
}

interface TimeEntry {
  id: string;
  projectId: number;
  issueId?: number;
  activityId: number;
  date: string;
  hours: number;
  comments: string;
}

interface EnhancedTimeEntryFormProps {
  selectedProject: Project;
  activities: Activity[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose?: () => void;
}

export function EnhancedTimeEntryForm({ 
  selectedProject, 
  activities, 
  selectedDate, 
  onDateSelect,
  onClose
}: EnhancedTimeEntryFormProps) {
  // Initialize with one default entry using the selected project
  const [entries, setEntries] = useState<TimeEntry[]>([{
    id: Date.now().toString(),
    projectId: selectedProject.id,
    issueId: undefined,
    activityId: activities[0]?.id || 0,
    date: format(selectedDate, 'yyyy-MM-dd'),
    hours: 8,
    comments: '',
  }]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [requireIssue, setRequireIssue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);

  // Focus on the date field when the form opens
  useEffect(() => {
    if (dateButtonRef.current) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        dateButtonRef.current?.focus();
      }, 100);
    }
  }, []);

  // Load preferences and issues for the selected project
  useEffect(() => {
    const loadData = async () => {
      if (!selectedProject) return;
      
      // Load preferences
      try {
        const jwt = await getAppwriteJWT();
        const prefs = await getTimeEntryPreferencesWithJWT(jwt);
        setRequireIssue(prefs.requireIssue);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            component: 'enhanced-time-entry-form',
            errorType: 'load_preferences_failed',
          },
        });
      }
      
      // Load issues
      setLoadingIssues(true);
      try {
        const projectIssues = await getProjectIssues(selectedProject.id);
        setIssues(projectIssues);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            component: 'enhanced-time-entry-form',
            errorType: 'load_issues_failed',
          },
          extra: {
            projectId: selectedProject.id,
          },
        });
        toast.error('Failed to load issues. You can still create entries without selecting an issue.');
        setIssues([]);
      } finally {
        setLoadingIssues(false);
      }
    };

    loadData();
  }, [selectedProject]);

  const addEntry = () => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      projectId: selectedProject.id,
      issueId: undefined,
      activityId: activities[0]?.id || 0,
      date: format(selectedDate, 'yyyy-MM-dd'),
      hours: 8,
      comments: '',
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number | undefined) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const showConfirmDialog = (title: string, description: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      setConfirmDialog({
        open: true,
        title,
        description,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve();
        },
      });
    });
  };

  const handleSubmit = async () => {
    // Run validations with requireIssue preference
    const validation = validateTimeEntries(entries, { requireIssue });

    // Handle errors (blocking)
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error.message);
      });
      return;
    }

    // Handle warnings (confirmation dialogs)
    for (const warning of validation.warnings) {
      try {
        await showConfirmDialog(warning.title, warning.description);
      } catch {
        return; // User cancelled
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('entries', JSON.stringify(entries));
      
      await createBulkTimeEntries(formData);
      
      toast.success('Time entries created successfully!');
      setEntries([{
        id: Date.now().toString(),
        projectId: selectedProject.id,
        issueId: undefined,
        activityId: activities[0]?.id || 0,
        date: format(selectedDate, 'yyyy-MM-dd'),
        hours: 8,
        comments: '',
      }]);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          component: 'enhanced-time-entry-form',
          errorType: 'create_entries_failed',
        },
        extra: {
          entryCount: entries.length,
        },
      });
      toast.error('Failed to create time entries. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Time Entry Form</CardTitle>
            <CardDescription>
              Add your time entries for the selected date
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                ref={dateButtonRef}
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateSelect(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Entry {entries.indexOf(entry) + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEntry(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Project Info (Read-only) */}
              <div className="space-y-2 mb-3">
                <Label>Project</Label>
                <div className="w-full px-3 py-2 bg-muted rounded-md text-sm">
                  {selectedProject.name}
                </div>
              </div>

              {/* Issue Selector */}
              <div className="space-y-2">
                <Label htmlFor={`issue-${entry.id}`}>
                  Issue {requireIssue ? <span className="text-destructive">*</span> : '(Optional)'}
                </Label>
                {loadingIssues ? (
                  <div className="w-full px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                    Loading issues...
                  </div>
                ) : (
                  <Select
                    value={entry.issueId?.toString() || 'none'}
                    onValueChange={(value) => updateEntry(entry.id, 'issueId', value === 'none' ? undefined : parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an issue or leave blank" />
                    </SelectTrigger>
                    <SelectContent>
                      {!requireIssue && <SelectItem value="none">No issue (project-level entry)</SelectItem>}
                      {issues.map((issue) => (
                        <SelectItem key={issue.id} value={issue.id.toString()}>
                          <div className="flex flex-col">
                            <span>#{issue.id}: {issue.subject}</span>
                            <span className="text-xs text-muted-foreground">
                              {issue.tracker.name} - {issue.status.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`activity-${entry.id}`}>Activity</Label>
                  <Select
                    value={entry.activityId.toString()}
                    onValueChange={(value) => updateEntry(entry.id, 'activityId', parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`hours-${entry.id}`}>Hours</Label>
                <Input
                  id={`hours-${entry.id}`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={entry.hours}
                  onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`comments-${entry.id}`}>
                  Comments <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`comments-${entry.id}`}
                  placeholder="Enter comments (required)..."
                  value={entry.comments}
                  onChange={(e) => updateEntry(entry.id, 'comments', e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Button */}
        <Button
          variant="outline"
          onClick={addEntry}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>

        {/* Summary */}
        {entries.length > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Hours:</span>
              <Badge variant={totalHours >= 8 ? "default" : "secondary"}>
                {totalHours} hours
              </Badge>
            </div>
            {totalHours < 8 && (
              <p className="text-sm text-muted-foreground mt-1">
                Warning: Less than 8 hours for the day
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={entries.length === 0 || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Creating...' : 'Create Time Entries'}
        </Button>
      </CardContent>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <AlertDialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialog(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.onConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}