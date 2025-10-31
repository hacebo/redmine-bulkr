'use client';

import { useState, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { SubmissionLoader } from '@/components/shared/submission-loader';
import { format, addDays, parse } from 'date-fns';
import { createBulkTimeEntries } from '@/app/lib/actions/time-entries';
import { getProjectIssues } from '@/app/lib/actions/projects';
import { getTimeEntryPreferencesWithJWT } from '@/app/(protected)/settings/preferences/actions';
import { getAppwriteJWT } from '@/lib/appwrite-jwt.client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { validateTimeEntries } from '@/app/lib/utils/time-entry-validations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

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
  issueId?: number;
  activityId: number;
  summary: string;
  dailyHours: Record<string, number>;
}

interface RedmineTimeEntry {
  id: number;
  projectId: number;
  activityId: number;
  activityName: string;
  date: string;
  hours: number;
  comments: string;
}

interface BulkEntryData {
  projects: Project[];
  activities: Activity[];
  timeEntries: RedmineTimeEntry[];
  selectedProject: Project;
}

interface BulkEntry {
  projectId: number;
  issueId?: number;
  activityId: number;
  date: string;
  hours: number;
  comments: string;
}

interface BulkEntryClientProps {
  dataPromise: Promise<BulkEntryData>;
  initialWeekStart: string;
  onBack?: () => void;
}

export function BulkEntryClient({
  dataPromise,
  initialWeekStart,
  onBack
}: BulkEntryClientProps) {
  // Use React 19's `use` hook to unwrap the promise
  const { projects, activities, timeEntries: initialTimeEntries, selectedProject } = use(dataPromise);
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const currentWeekStart = initialWeekStart;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [requireIssue, setRequireIssue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Calculate the bi-weekly period from the current week start
  const weekStart = parse(currentWeekStart, 'yyyy-MM-dd', new Date());
  const weekEnd = addDays(weekStart, 13);

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
            component: 'bulk-entry-client',
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
            component: 'bulk-entry-client',
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

  // Generate all days in the bi-weekly period
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const dayLabels = days.map(day => ({
    date: day,
    label: format(day, 'EEE d'),
    isWeekend: day.getDay() === 0 || day.getDay() === 6
  }));

  const addEntry = () => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      issueId: undefined,
      activityId: activities[0]?.id || 0,
      summary: '',
      dailyHours: {}
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number | undefined) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const updateDailyHours = (entryId: string, date: string, hours: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? { 
            ...entry, 
            dailyHours: { 
              ...entry.dailyHours, 
              [date]: hours 
            } 
          } 
        : entry
    ));
  };

  const getTotalHoursForDay = (date: string): number => {
    const newEntryHours = entries.reduce((total, entry) => total + (entry.dailyHours[date] || 0), 0);
    const existingHours = initialTimeEntries
      .filter(entry => entry.date === date)
      .reduce((total, entry) => total + entry.hours, 0);
    
    return newEntryHours + existingHours;
  };

  const getExpectedHoursForDay = (day: Date): number => {
    const dayOfWeek = day.getDay();
    return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 8 : 0;
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    const bulkEntries = entries.flatMap(entry => 
      Object.entries(entry.dailyHours)
        .map(([date, hours]) => ({
          projectId: selectedProject.id,
          issueId: entry.issueId,
          activityId: entry.activityId,
          date,
          hours,
          comments: entry.summary
        }))
    );

    // Run validations using shared utility with requireIssue preference
    const validation = validateTimeEntries(bulkEntries, { requireIssue });

    // Handle errors (blocking)
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error.message);
      });
      return;
    }

    // Handle warnings (confirmation dialogs) sequentially
    for (const warning of validation.warnings) {
      try {
        await new Promise<void>((resolve, reject) => {
          setConfirmDialog({
            open: true,
            title: warning.title,
            description: warning.description,
            onConfirm: () => {
              setConfirmDialog(null);
              resolve();
            },
            onCancel: () => {
              setConfirmDialog(null);
              reject();
            },
          });
        });
      } catch {
        return; // User cancelled
      }
    }

    return submitEntries(bulkEntries);
  };


  const submitEntries = async (bulkEntries: BulkEntry[]) => {

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('entries', JSON.stringify(bulkEntries));

      await createBulkTimeEntries(formData);
      toast.success('Time entries submitted successfully!');
      setEntries([]);
      router.refresh();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          component: 'bulk-entry-client',
          errorType: 'submit_entries_failed',
        },
        extra: {
          entryCount: bulkEntries?.length || 0,
        },
      });
      toast.error('Failed to submit time entries');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = addDays(weekStart, direction === 'next' ? 14 : -14);
    const newWeekStartStr = format(newWeekStart, 'yyyy-MM-dd');
    router.push(`/bulk-entry?projectId=${selectedProject.id}&weekStart=${newWeekStartStr}`);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Navigate back to time tracking with the selected project
      if (selectedProject?.id) {
        router.push(`/time-tracking?projectId=${selectedProject.id}`);
      } else {
        router.push('/time-tracking');
      }
    }
  };

  // Mobile View - Completely different UI
  if (isMobile) {
    return (
      <>
        <SubmissionLoader isSubmitting={isSubmitting} />
        <div className="w-full min-h-screen pb-20">
        <div className="p-3 space-y-3">
          {/* Mobile Header */}
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-9 px-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm">Back</span>
          </Button>

          <Card>
            <CardContent className="p-3 space-y-3">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="h-9 w-9 p-0 shrink-0"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-xs font-medium">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="h-9 w-9 p-0 shrink-0"
                  disabled={isSubmitting}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Project */}
              <Select
                value={selectedProject.id.toString()}
                onValueChange={(value) => {
                  router.push(`/bulk-entry?projectId=${value}&weekStart=${currentWeekStart}`);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Mobile Entries - Stacked by Entry */}
          {entries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>No entries yet</p>
                <Button onClick={addEntry} variant="outline" className="mt-4" disabled={isSubmitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-3 space-y-3">
                  {/* Entry Header */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-destructive h-10 w-10 p-0 shrink-0"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Select
                      value={entry.activityId.toString()}
                      onValueChange={(value) => updateEntry(entry.id, 'activityId', parseInt(value))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="flex-1">
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

                  {/* Issue Selector */}
                  {loadingIssues ? (
                    <div className="w-full px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                      Loading issues...
                    </div>
                  ) : (
                    <Select
                      value={entry.issueId?.toString() || 'none'}
                      onValueChange={(value) => updateEntry(entry.id, 'issueId', value === 'none' ? undefined : parseInt(value))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={requireIssue ? "Issue (required)" : "Issue (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!requireIssue && <SelectItem value="none">No issue</SelectItem>}
                        {issues.map((issue) => (
                          <SelectItem key={issue.id} value={issue.id.toString()}>
                            #{issue.id}: {issue.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    placeholder="Summary (required)"
                    value={entry.summary}
                    onChange={(e) => updateEntry(entry.id, 'summary', e.target.value)}
                    required
                    disabled={isSubmitting}
                  />

                  {/* Daily Hours - Vertical List */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Hours per day:</div>
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={dateStr} className="flex items-center gap-2">
                          <div className={`flex-1 text-sm ${isWeekend ? 'text-muted-foreground' : ''}`}>
                            {format(day, 'EEE, MMM d')}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="0"
                            value={entry.dailyHours[dateStr] || ''}
                            onChange={(e) => updateDailyHours(
                              entry.id,
                              dateStr,
                              parseFloat(e.target.value) || 0
                            )}
                            className="w-20 text-center"
                            disabled={isSubmitting}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Mobile Actions - Fixed Bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t flex gap-2">
            <Button
              onClick={addEntry}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || entries.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <AlertDialog
            open={confirmDialog.open}
            onOpenChange={(open) => !open && setConfirmDialog(null)}
          >
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
      </div>
      </>
    );
  }

  // Desktop View - Original Grid Layout
  return (
    <>
      <SubmissionLoader isSubmitting={isSubmitting} />
      <div className="w-full min-h-screen">
      <div className="max-w-6xl mx-auto p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
      {/* Compact Header */}
      <div className="space-y-2">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={handleBack} className="h-9 px-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm">Back to Calendar</span>
          </Button>
          
        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            className="h-9 w-9 p-0 shrink-0"
            disabled={isSubmitting}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          <span className="text-xs sm:text-sm font-medium px-2 whitespace-nowrap flex-1 text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            className="h-9 w-9 p-0 shrink-0"
            disabled={isSubmitting}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

        {/* Project Selector */}
          <Select
            value={selectedProject.id.toString()}
          onValueChange={(value) => {
            router.push(`/bulk-entry?projectId=${value}&weekStart=${currentWeekStart}`);
          }}
          disabled={isSubmitting}
          >
          <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={addEntry}
            variant="outline"
            className="flex-1 h-9 text-sm"
            disabled={isSubmitting}
          >
            <Plus className="h-3 w-3 mr-2" />
            Add Entry
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || entries.length === 0}
            className="flex-1 h-9 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>

      {/* Daily Hour Summary */}
      <Card>
        <CardContent className="p-1 sm:p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="space-y-2 sm:space-y-4">
                {/* Day Headers */}
                <div className="grid gap-0.5 sm:gap-2 text-center text-xs font-medium" style={{ gridTemplateColumns: isMobile ? '50px repeat(14, 38px)' : '80px repeat(14, minmax(40px, 56px))' }}>
                  <div></div>
                  {dayLabels.map((day, index) => (
                    <div key={index} className={`p-0.5 sm:p-1 ${day.isWeekend ? 'text-muted-foreground/50' : ''}`}>
                      <div className="hidden sm:block text-sm">{day.label}</div>
                      <div className="sm:hidden text-[9px] leading-tight">
                        <div>{format(day.date, 'EEE').substring(0, 1)}</div>
                        <div>{format(day.date, 'd')}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current Hours Row */}
                <div className="grid gap-0.5 sm:gap-2" style={{ gridTemplateColumns: isMobile ? '50px repeat(14, 38px)' : '80px repeat(14, minmax(40px, 56px))' }}>
                  <div className="text-[9px] sm:text-sm font-medium text-right pr-0.5 sm:pr-1 flex items-center">Curr:</div>
                  {dayLabels.map((day, index) => {
                    const totalHours = getTotalHoursForDay(format(day.date, 'yyyy-MM-dd'));
                    const expectedHours = getExpectedHoursForDay(day.date);
                    return (
                      <div key={index} className="text-center">
                        <div className={`py-0.5 sm:py-1 px-0.5 sm:px-2 rounded text-[10px] sm:text-sm font-medium ${
                          totalHours === expectedHours && expectedHours > 0
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                            : totalHours > 0
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {totalHours}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expected Hours Row */}
                <div className="grid gap-0.5 sm:gap-2" style={{ gridTemplateColumns: isMobile ? '50px repeat(14, 38px)' : '80px repeat(14, minmax(40px, 56px))' }}>
                  <div className="text-[9px] sm:text-sm font-medium text-right pr-0.5 sm:pr-1 flex items-center">Exp:</div>
                  {dayLabels.map((day, index) => (
                    <div key={index} className="text-center">
                      <div className={`py-0.5 sm:py-1 px-0.5 sm:px-2 rounded text-[10px] sm:text-sm font-medium ${
                        getExpectedHoursForDay(day.date) > 0 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {getExpectedHoursForDay(day.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entry Rows */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                No time entries yet. Click &quot;Add Entry&quot; to get started.
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="space-y-2">
                  {/* Top Row: Delete Button + Activity + Issue + Summary */}
                  <div className="flex gap-2 items-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px] p-0 shrink-0"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 space-y-2">
                      <Select
                        value={entry.activityId.toString()}
                        onValueChange={(value) => updateEntry(entry.id, 'activityId', parseInt(value))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full min-h-[44px]">
                          <div className="truncate w-full text-left text-sm">
                            {activities.find(a => a.id === entry.activityId)?.name || 'Select Activity'}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {activities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id.toString()}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Issue Selector */}
                      {loadingIssues ? (
                        <div className="w-full px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground min-h-[44px] flex items-center">
                          Loading issues...
                        </div>
                      ) : (
                        <Select
                          value={entry.issueId?.toString() || 'none'}
                          onValueChange={(value) => updateEntry(entry.id, 'issueId', value === 'none' ? undefined : parseInt(value))}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-full min-h-[44px]">
                            <div className="truncate w-full text-left text-sm">
                              {entry.issueId 
                                ? `#${entry.issueId}: ${issues.find(i => i.id === entry.issueId)?.subject || 'Unknown'}` 
                                : requireIssue ? 'Issue (required)' : 'Issue (optional)'}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {!requireIssue && <SelectItem value="none">No issue (project-level)</SelectItem>}
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

                      <Input
                        placeholder="Summary (required)"
                        value={entry.summary}
                        onChange={(e) => updateEntry(entry.id, 'summary', e.target.value)}
                        className="w-full min-h-[44px] text-sm"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Bottom Row: Daily Hour Inputs */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid gap-0.5 sm:gap-2" style={{ gridTemplateColumns: isMobile ? '50px repeat(14, 38px)' : '80px repeat(14, minmax(40px, 56px))' }}>
                        <div className="text-[9px] sm:text-xs font-medium text-muted-foreground flex items-center justify-end pr-0.5 sm:pr-1">Hrs:</div>
                        {dayLabels.map((day, dayIndex) => (
                          <div key={dayIndex}>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={entry.dailyHours[format(day.date, 'yyyy-MM-dd')] || ''}
                              onChange={(e) => updateDailyHours(
                                entry.id,
                                format(day.date, 'yyyy-MM-dd'),
                                parseFloat(e.target.value) || 0
                              )}
                              className={`text-center px-0 text-[11px] sm:text-xs ${isMobile ? 'h-8' : 'h-9 sm:h-10'}`}
                              disabled={isSubmitting}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                confirmDialog.onCancel?.();
                setConfirmDialog(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.onConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </>
  );
}
