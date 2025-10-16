'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, List, Grid } from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getActivityColorClasses } from '@/app/lib/utils/activity-colors';

interface TimeEntry {
  id: string;
  projectId: number;
  issueId?: number;
  activityId: number;
  activityName: string;
  date: string;
  hours: number;
  comments: string;
  projectName: string;
  issueSubject?: string;
}

interface ListViewProps {
  timeEntries: TimeEntry[];
  projects: Array<{ id: number; name: string }>;
  activities: Array<{ id: number; name: string }>;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  currentWeekStart: Date;
  onProjectChange: (projectId: number) => void;
  selectedProjectId?: number;
}

export function ListView({
  timeEntries,
  projects,
  activities,
  onNavigateWeek,
  currentWeekStart,
  onProjectChange,
  selectedProjectId
}: ListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // Filter entries based on search term
  const filteredEntries = timeEntries.filter(entry => 
    entry.comments.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.issueSubject && entry.issueSubject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group entries by date
  const groupedEntries = filteredEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, TimeEntry[]>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today ${format(date, 'MMMM d, yyyy')}`;
    if (isYesterday(date)) return `Yesterday ${format(date, 'MMMM d, yyyy')}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, 'MMMM d, yyyy')}`;
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getTotalHoursForDate = (dateStr: string) => {
    return filteredEntries
      .filter(entry => entry.date === dateStr)
      .reduce((total, entry) => total + entry.hours, 0);
  };

  return (
    <div className="space-y-4">
        {/* Navigation Controls */}
        <div className="flex items-center justify-between gap-2">
          <div></div> {/* Empty div for spacing */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateWeek('prev')}
              className="h-9 w-9 p-0 shrink-0"
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateWeek('next')}
              className="h-9 w-9 p-0 shrink-0"
            >
              →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/time-tracking')}
              className="h-9 shrink-0"
            >
              Today
            </Button>
          </div>
        </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search time entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Project Filter */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Project:</span>
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 sm:gap-1">
          <Button
            variant={!selectedProjectId ? 'default' : 'outline'}
            size="sm"
            onClick={() => onProjectChange(0)}
            className="h-8 text-xs w-full sm:w-auto justify-center sm:justify-start"
          >
            All
          </Button>
          {projects.map(project => (
            <Button
              key={project.id}
              variant={selectedProjectId === project.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onProjectChange(project.id)}
              className="h-8 text-xs w-full sm:w-auto sm:max-w-[200px] justify-center sm:justify-start truncate"
              title={project.name}
            >
              {project.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Time Entries List */}
      <div className="space-y-4">
        {Object.keys(groupedEntries).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time entries found</p>
              {searchTerm && (
                <p className="text-sm mt-2">Try adjusting your search terms</p>
              )}
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedEntries)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([dateStr, entries]) => (
              <div key={dateStr}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                  <h3 className="text-base font-semibold">
                    {formatDateHeader(dateStr)}
                  </h3>
                  <Badge variant="secondary" className="text-xs px-2 py-1 w-fit">
                    {entries.length} entries • {getTotalHoursForDate(dateStr)}h
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        {/* Mobile: Stack vertically, Desktop: Horizontal */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          {/* Time and Activity */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm shrink-0">{entry.hours}h</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 shrink-0 ${getActivityColorClasses(entry.activityName)}`}
                            >
                              {entry.activityName}
                            </Badge>
                          </div>
                          
                          {/* Project and Description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {entry.projectName}
                              </h4>
                              {entry.issueSubject && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  #{entry.issueId}
                                </span>
                              )}
                            </div>
                            {entry.comments && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {entry.comments}
                              </p>
                            )}
                          </div>
                          
                          {/* Time display */}
                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            {format(new Date(entry.date), 'HH:mm')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
