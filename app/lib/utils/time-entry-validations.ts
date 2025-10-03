import { format, parse } from 'date-fns';

export interface TimeEntryValidation {
  projectId: number;
  issueId?: number;
  activityId: number;
  date: string;
  hours: number;
  comments?: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  type: 'zero_hours' | 'weekend' | 'over_eight_hours';
  title: string;
  description: string;
  affectedDates: string[];
}

export interface ValidationError {
  type: 'missing_comments' | 'no_entries' | 'missing_issue';
  message: string;
}

export function validateTimeEntries(
  entries: TimeEntryValidation[], 
  options: { requireIssue?: boolean } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const { requireIssue = false } = options;

  // Error: No entries
  if (entries.length === 0) {
    errors.push({
      type: 'no_entries',
      message: 'Please add at least one time entry'
    });
    return { isValid: false, warnings, errors };
  }

  // Error: Missing issue (if required by preferences)
  if (requireIssue) {
    const missingIssue = entries.filter(entry => !entry.issueId);
    if (missingIssue.length > 0) {
      errors.push({
        type: 'missing_issue',
        message: 'Issue is required for all time entries. Please select an issue or change your preferences in Settings.'
      });
      return { isValid: false, warnings, errors };
    }
  }

  // Error: Missing comments
  const missingComments = entries.filter(entry => !entry.comments || entry.comments.trim() === '');
  if (missingComments.length > 0) {
    errors.push({
      type: 'missing_comments',
      message: 'Comments are required for all time entries'
    });
    return { isValid: false, warnings, errors };
  }

  // Warning: Zero hours entries
  const zeroHourEntries = entries.filter(entry => entry.hours === 0);
  if (zeroHourEntries.length > 0) {
    const zeroHourDates = zeroHourEntries.map(e => 
      format(parse(e.date, 'yyyy-MM-dd', new Date()), 'MMM d')
    );
    warnings.push({
      type: 'zero_hours',
      title: 'Zero Hours Detected',
      description: `You have entries with 0 hours on (${zeroHourDates.join(', ')}). Are you sure you want to continue?`,
      affectedDates: zeroHourEntries.map(e => e.date)
    });
  }

  // Warning: Weekend entries
  const weekendEntries = entries.filter(entry => {
    const date = parse(entry.date, 'yyyy-MM-dd', new Date());
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  });

  if (weekendEntries.length > 0) {
    const weekendDates = weekendEntries.map(e => 
      format(parse(e.date, 'yyyy-MM-dd', new Date()), 'MMM d')
    );
    warnings.push({
      type: 'weekend',
      title: 'Weekend Entry Detected',
      description: `You have entries on weekend days (${weekendDates.join(', ')}). Do you want to continue?`,
      affectedDates: weekendEntries.map(e => e.date)
    });
  }

  // Warning: Daily totals over 8 hours
  const dailyTotals: Record<string, number> = {};
  entries.forEach(entry => {
    if (!dailyTotals[entry.date]) {
      dailyTotals[entry.date] = 0;
    }
    dailyTotals[entry.date] += entry.hours;
  });

  const overEightDays = Object.entries(dailyTotals)
    .filter(([, total]) => total > 8)
    .map(([date, total]) => ({ date, total }));

  if (overEightDays.length > 0) {
    const overEightDates = overEightDays.map(({ date, total }) => 
      `${format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d')} (${total.toFixed(1)}h)`
    );
    warnings.push({
      type: 'over_eight_hours',
      title: 'Hours Exceed 8 Per Day',
      description: `The following days have more than 8 hours: ${overEightDates.join(', ')}. Is this correct?`,
      affectedDates: overEightDays.map(({ date }) => date)
    });
  }

  return {
    isValid: true,
    warnings,
    errors
  };
}

