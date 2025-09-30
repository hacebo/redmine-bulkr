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
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { format, addDays, parse } from 'date-fns';
import { createBulkTimeEntries } from '@/app/lib/actions/time-entries';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface TimeEntry {
  id: string;
  issue: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Calculate the bi-weekly period from the current week start
  const weekStart = parse(currentWeekStart, 'yyyy-MM-dd', new Date());
  const weekEnd = addDays(weekStart, 13);

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
      issue: '',
      activityId: activities[0]?.id || 0,
      summary: '',
      dailyHours: {}
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
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

  const validateWeekendEntries = (entries: BulkEntry[]) => {
    const weekendEntries = entries.filter(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });
    return weekendEntries.length > 0 ? weekendEntries : null;
  };

  const validateDailyHours = (entries: BulkEntry[]) => {
    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      if (!dailyTotals[entry.date]) {
        dailyTotals[entry.date] = 0;
      }
      dailyTotals[entry.date] += entry.hours;
    });
    
    const overEightHours = Object.entries(dailyTotals)
      .filter(([, total]) => total > 8)
      .map(([date, total]) => ({ date, total }));
    
    return overEightHours.length > 0 ? overEightHours : null;
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
          activityId: entry.activityId,
          date,
          hours,
          comments: entry.summary
        }))
    );

    if (bulkEntries.length === 0) {
      toast.error('Please enter some hours');
      return;
    }

    // Validation: Check for missing comments
    const missingComments = bulkEntries.filter(entry => !entry.comments || entry.comments.trim() === '');
    if (missingComments.length > 0) {
      toast.error('Comments are required for all time entries');
      return;
    }

    // Validation: Check for 0 hours entries
    const zeroHourEntries = bulkEntries.filter(entry => entry.hours === 0);
    if (zeroHourEntries.length > 0) {
      const zeroHourDates = zeroHourEntries.map(e => e.date).join(', ');
      return new Promise<void>((resolve) => {
        setConfirmDialog({
          open: true,
          title: "Zero Hours Detected",
          description: `You have entries with 0 hours on (${zeroHourDates}). Are you sure you want to continue?`,
          onConfirm: () => {
            setConfirmDialog(null);
            resolve();
          },
        });
      }).then(() => {
        const weekendEntries = validateWeekendEntries(bulkEntries);
        if (weekendEntries) {
          return handleWeekendValidation(weekendEntries, bulkEntries);
        }
        const overEightHours = validateDailyHours(bulkEntries);
        if (overEightHours) {
          return validateOverEightHours(overEightHours, bulkEntries);
        }
        return submitEntries(bulkEntries);
      });
    }

    const weekendEntries = validateWeekendEntries(bulkEntries);
    if (weekendEntries) {
      return handleWeekendValidation(weekendEntries, bulkEntries);
    }

    const overEightHours = validateDailyHours(bulkEntries);
    if (overEightHours) {
      return validateOverEightHours(overEightHours, bulkEntries);
    }

    return submitEntries(bulkEntries);
  };

  const handleWeekendValidation = (weekendEntries: BulkEntry[], bulkEntries: BulkEntry[]) => {
    const weekendDates = weekendEntries.map(e => e.date).join(', ');
    return new Promise<void>((resolve) => {
      setConfirmDialog({
        open: true,
        title: "Weekend Entries Detected",
        description: `You're adding time entries for weekend(s): ${weekendDates}. Is this correct?`,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve();
        },
      });
    }).then(() => {
      const overEightHours = validateDailyHours(bulkEntries);
      if (overEightHours) {
        return validateOverEightHours(overEightHours, bulkEntries);
      }
      return submitEntries(bulkEntries);
    });
  };

  const validateOverEightHours = (overEightHours: Array<{ date: string; total: number }>, bulkEntries: BulkEntry[]) => {
    const overEightDates = overEightHours.map(e => `${e.date} (${e.total}h)`).join(', ');
    return new Promise<void>((resolve) => {
      setConfirmDialog({
        open: true,
        title: "Hours Exceed 8 Per Day",
        description: `The following days have more than 8 hours: ${overEightDates}. Is this correct?`,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve();
        },
      });
    }).then(() => submitEntries(bulkEntries));
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
      console.error('Error submitting entries:', error);
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
                <Button onClick={addEntry} variant="outline" className="mt-4">
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Select
                      value={entry.activityId.toString()}
                      onValueChange={(value) => updateEntry(entry.id, 'activityId', parseInt(value))}
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

                  <Input
                    placeholder="Summary (required)"
                    value={entry.summary}
                    onChange={(e) => updateEntry(entry.id, 'summary', e.target.value)}
                    required
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
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || entries.length === 0}
              className="flex-1"
            >
              Submit
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
    );
  }

  // Desktop View - Original Grid Layout
  return (
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
          >
            <Plus className="h-3 w-3 mr-2" />
            Add Entry
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || entries.length === 0}
            className="flex-1 h-9 text-sm"
          >
            Submit
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
                  {/* Top Row: Delete Button + Activity + Summary */}
                  <div className="flex gap-2 items-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px] p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 space-y-2">
                      <Select
                        value={entry.activityId.toString()}
                        onValueChange={(value) => updateEntry(entry.id, 'activityId', parseInt(value))}
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

                      <Input
                        placeholder="Summary (required)"
                        value={entry.summary}
                        onChange={(e) => updateEntry(entry.id, 'summary', e.target.value)}
                        className="w-full min-h-[44px] text-sm"
                        required
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
  );
}
