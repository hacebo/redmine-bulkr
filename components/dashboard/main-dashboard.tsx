'use client';

import { useState, useMemo, useCallback, useEffect, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Calendar, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addWeeks, isSameDay, isSameMonth } from 'date-fns';
import { EnhancedTimeEntryForm } from '@/components/forms/enhanced-time-entry-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Project, Activity } from '@/app/lib/types';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { getMonthlyTimeEntries } from '@/app/lib/actions/time-entries';

interface DashboardData {
  projects: Project[];
  activities: Activity[];
}

interface MainDashboardProps {
  dataPromise: Promise<DashboardData>;
  currentMonth: Date;
  initialProjectId?: number;
}

export function MainDashboard({ dataPromise, currentMonth: initialMonth, initialProjectId }: MainDashboardProps) {
  const router = useRouter();
  
  // Use React 19's use hook to unwrap the promise
  const { projects, activities } = use(dataPromise);
  
  // Initialize selected project from URL param or first project
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    if (initialProjectId) {
      return projects.find(p => p.id === initialProjectId) || projects[0] || null;
    }
    return projects[0] || null;
  });
  
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [allTimeEntries, setAllTimeEntries] = useState<Array<{
    id: number;
    projectId: number;
    activityId: number;
    activityName: string;
    date: string;
    hours: number;
    comments: string;
  }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // Update URL with selected project on mount if no projectId was provided
  const hasInitialProjectId = !!initialProjectId;
  useEffect(() => {
    if (selectedProject && !hasInitialProjectId) {
      router.push(`/time-tracking?projectId=${selectedProject.id}`, { scroll: false });
    }
  }, [selectedProject, hasInitialProjectId, router]);

  // Memoize month boundaries and date range to prevent infinite re-renders
  const { weeks, visibleRangeStart, visibleRangeEnd } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const weeksArray: Date[][] = [];
    let currentWeekStart = startOfWeek(start, { weekStartsOn: 1 }); // Monday
    
    // Always show at least 5 weeks (35 days) to ensure complete month coverage
    const maxWeeks = 6; // Maximum weeks to prevent infinite loops
    
    for (let i = 0; i < maxWeeks; i++) {
      const week = Array.from({ length: 7 }, (_, j) => addDays(currentWeekStart, j));
      weeksArray.push(week);
      currentWeekStart = addWeeks(currentWeekStart, 1);
      
      // Stop if we've covered the month and the next week is completely in the next month
      const nextWeekStart = addWeeks(currentWeekStart, 0);
      if (nextWeekStart > end && i >= 4) { // At least 5 weeks shown
        break;
      }
    }
    
    // Calculate visible range once and memoize as stable strings
    const firstVisibleDay = weeksArray[0][0];
    const lastVisibleDay = weeksArray[weeksArray.length - 1][6];
    const rangeStart = format(firstVisibleDay, 'yyyy-MM-dd');
    const rangeEnd = format(lastVisibleDay, 'yyyy-MM-dd');
    
    return { 
      weeks: weeksArray,
      visibleRangeStart: rangeStart,
      visibleRangeEnd: rangeEnd
    };
  }, [currentMonth]);

  // Load time entries when project is selected
  // Using stable string values in dependencies to prevent infinite loops
  useEffect(() => {
    if (selectedProject) {
      const loadTimeEntries = async () => {
        setLoadingTimeEntries(true);
        try {
          const entries = await getMonthlyTimeEntries(visibleRangeStart, visibleRangeEnd);
          setAllTimeEntries(entries);
        } catch (error) {
          console.error('Error loading time entries:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to load time entries';
          toast.error(errorMessage);
          setAllTimeEntries([]);
        } finally {
          setLoadingTimeEntries(false);
        }
      };

      loadTimeEntries();
    } else {
      setAllTimeEntries([]);
    }
  }, [selectedProject, visibleRangeStart, visibleRangeEnd]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowDayDetails(true);
    setShowTimeEntryForm(false);
  }, []);

  const handleBulkEntry = useCallback(() => {
    if (selectedProject) {
      router.push(`/bulk-entry?projectId=${selectedProject.id}&weekStart=${format(currentMonth, 'yyyy-MM-dd')}`);
    } else {
      toast.error('Please select a project first');
    }
  }, [selectedProject, currentMonth, router]);

  const handleAddEntry = useCallback(() => {
    setShowTimeEntryForm(true);
    setShowDayDetails(false);
  }, []);

  // Get activity badge color based on activity name
  const getActivityBadgeColor = (activityName: string) => {
    const name = activityName.toLowerCase();
    
    if (name.includes('vacation') || name.includes('pto') || name.includes('holiday')) {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-200 dark:border-blue-800';
    }
    if (name.includes('development') || name.includes('coding')) {
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-200 dark:border-green-800';
    }
    if (name.includes('meeting') || name.includes('call')) {
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 border-purple-200 dark:border-purple-800';
    }
    if (name.includes('review') || name.includes('testing')) {
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100 border-orange-200 dark:border-orange-800';
    }
    if (name.includes('documentation') || name.includes('doc')) {
      return 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-100 border-cyan-200 dark:border-cyan-800';
    }
    if (name.includes('design')) {
      return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-100 border-pink-200 dark:border-pink-800';
    }
    if (name.includes('support') || name.includes('bug')) {
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 border-red-200 dark:border-red-800';
    }
    
    // Default
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700';
  };

  const getDayHours = useCallback((date: Date) => {
    if (!selectedProject) return 0;
    
    const targetDateStr = format(date, 'yyyy-MM-dd');
    const dayEntries = allTimeEntries.filter((entry) => {
      // Filter by: 1) Date, 2) Selected Project
      return entry.date === targetDateStr && entry.projectId === selectedProject.id;
    });
    
    const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
    
    return totalHours;
  }, [allTimeEntries, selectedProject]);

  const getZeroHourEntry = useCallback((date: Date) => {
    if (!selectedProject) return null;
    
    const targetDateStr = format(date, 'yyyy-MM-dd');
    const dayEntries = allTimeEntries.filter((entry) => {
      return entry.date === targetDateStr && entry.projectId === selectedProject.id;
    });
    
    // Find any entry with 0 hours (vacation, holiday, sick leave, etc.)
    const zeroHourEntry = dayEntries.find(entry => entry.hours === 0);
    
    if (zeroHourEntry) {
      return zeroHourEntry.activityName;
    }
    
    return null;
  }, [allTimeEntries, selectedProject]);

  const getDayEntries = useCallback((date: Date) => {
    if (!selectedProject) return [];
    
    const targetDateStr = format(date, 'yyyy-MM-dd');
    return allTimeEntries.filter((entry) => {
      return entry.date === targetDateStr && entry.projectId === selectedProject.id;
    });
  }, [allTimeEntries, selectedProject]);

  const getTotalHoursForMonth = () => {
    if (!selectedProject) return 0;
    
    return allTimeEntries
      .filter(entry => entry.projectId === selectedProject.id)
      .reduce((total, entry) => total + entry.hours, 0);
  };

  const getExpectedHours = () => {
    const workingDays = weeks.flat().filter(day => 
      isSameMonth(day, currentMonth) && day.getDay() !== 0 && day.getDay() !== 6
    ).length;
    return workingDays * 8;
  };

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header with Project Selection */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Time Entry Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Select value={selectedProject?.id.toString() || ''} onValueChange={(value) => {
              const project = projects.find(p => p.id.toString() === value);
              setSelectedProject(project || null);
              setShowTimeEntryForm(false);
              // Update URL with selected project
              router.push(`/time-tracking?projectId=${value}`);
            }}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Select a project to view time entries" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProject && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={handleBulkEntry} variant="outline" className="flex items-center justify-center gap-2 min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  Quick Bulk Entry
                </Button>
                <Button onClick={handleAddEntry} variant="outline" className="flex items-center justify-center gap-2 min-h-[44px]">
                  <Calendar className="h-4 w-4" />
                  Add Entry
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Grid Layout */}
        <div className={`grid grid-cols-1 gap-6 ${showTimeEntryForm ? 'lg:grid-cols-3' : ''}`}>
          {/* Monthly Calendar */}
          <div className={showTimeEntryForm ? 'lg:col-span-2' : ''}>
            {selectedProject ? (
              loadingTimeEntries ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Time View</CardTitle>
                    <CardDescription>
                      {format(currentMonth, 'MMMM yyyy')} - {selectedProject.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Week headers skeleton */}
                      <div className="grid grid-cols-7 gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar grid skeleton */}
                      <div className="space-y-2">
                        {weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="grid grid-cols-7 gap-1">
                            {week.map((day, dayIndex) => {
                              const isCurrentMonth = isSameMonth(day, currentMonth);
                              const isToday = isSameDay(day, new Date());
                              
                              return (
                                <div
                                  key={dayIndex}
                                  className={`
                                    min-h-[60px] p-2 border rounded-lg
                                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                                    ${isToday ? 'ring-2 ring-primary' : ''}
                                  `}
                                >
                                  <div className="flex flex-col h-full">
                                    <div className="text-sm font-medium">
                                      {format(day, 'd')}
                                    </div>
                                    {isCurrentMonth && (
                                      <div className="text-xs text-muted-foreground mt-auto">
                                        <div className="animate-pulse bg-muted h-3 w-8 rounded"></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Summary skeleton */}
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Total Hours</div>
                            <div className="animate-pulse bg-muted-foreground/20 h-8 w-16 rounded mt-1"></div>
                          </div>
                          <div>
                            <div className="font-medium">Expected Hours</div>
                            <div className="animate-pulse bg-muted-foreground/20 h-8 w-16 rounded mt-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Monthly Time View</CardTitle>
                      <CardDescription>
                        {format(currentMonth, 'MMMM yyyy')} - {selectedProject.name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonth(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Week headers */}
                    <div className="grid grid-cols-7 gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="space-y-2">
                      {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-1">
                          {week.map((day, dayIndex) => {
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const dayHours = getDayHours(day);
                            const zeroHourActivityName = getZeroHourEntry(day);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                              <div
                                key={dayIndex}
                                className={`
                                  min-h-[60px] p-2 border rounded-lg cursor-pointer transition-colors touch-manipulation
                                  ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                                  ${isToday ? 'ring-2 ring-primary' : ''}
                                  hover:bg-muted active:bg-muted/80
                                `}
                                onClick={() => handleDateClick(day)}
                              >
                                <div className="flex flex-col h-full">
                                  <div className="text-sm font-medium">
                                    {format(day, 'd')}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-auto">
                                    {zeroHourActivityName ? (
                                      <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1 py-0.5 rounded text-xs font-medium truncate">
                                        {zeroHourActivityName}
                                      </div>
                                    ) : (
                                      <span className={dayHours === 0 ? 'text-muted-foreground/50' : ''}>
                                        {dayHours.toFixed(1)}h
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Total Hours</div>
                          <div className="text-2xl font-bold">{getTotalHoursForMonth().toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="font-medium">Expected Hours</div>
                          <div className="text-2xl font-bold">{getExpectedHours()}h</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{((getTotalHoursForMonth() / getExpectedHours()) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((getTotalHoursForMonth() / getExpectedHours()) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Legend:</div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800" />
                          <span>Special (0h entries)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-foreground" />
                          <span>Logged hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                          <span>No entries (0h)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Time View</CardTitle>
                  <CardDescription>
                    Select a project to view your time entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Choose a project from the dropdown above to get started</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Time Entry Form - Right Side */}
          {showTimeEntryForm && (
            <div className="lg:col-span-1">
              <EnhancedTimeEntryForm 
                selectedProject={selectedProject!}
                activities={activities}
                selectedDate={selectedDate || new Date()}
                onDateSelect={setSelectedDate}
                onClose={() => {
                  setShowTimeEntryForm(false);
                  setSelectedDate(null);
                }}
              />
            </div>
          )}
        </div>


        {/* Day Details Panel */}
        {showDayDetails && selectedDate && selectedProject && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-h-96 overflow-y-auto z-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Time Entries for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setShowDayDetails(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {(() => {
                const dayEntries = getDayEntries(selectedDate);
                const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
                
                if (dayEntries.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        No time entries for this day
                      </p>
                      <Button 
                        onClick={() => {
                          setShowDayDetails(false);
                          setShowTimeEntryForm(true);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Entry for {format(selectedDate, 'MMM d')}
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Total: {totalHours.toFixed(1)} hours
                    </div>
                    
                    <div className="space-y-2">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getActivityBadgeColor(entry.activityName)}>
                                {entry.activityName}
                              </Badge>
                            </div>
                            {entry.comments && (
                              <div className="text-sm text-muted-foreground mt-2">
                                {entry.comments}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{entry.hours.toFixed(1)}h</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {entry.id}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}