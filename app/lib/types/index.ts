// Core data types for BulkRedmine application

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface Project {
  id: number;
  name: string;
  identifier: string;
}

export interface Activity {
  id: number;
  name: string;
  is_default: boolean;
}

export interface Issue {
  id: number;
  subject: string;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
}

export interface TimeEntry {
  id: number;
  projectId: number;
  issueId?: number;
  activityId: number;
  activityName: string;
  date: string;
  hours: number;
  comments: string;
  syncedToRedmine: boolean;
}

export interface WeeklyTimeData {
  totalHours: number;
  entries: TimeEntry[];
  byProject: Record<number, number>;
  byActivity: Record<number, number>;
}

export interface MonthlyTimeData {
  totalHours: number;
  entries: TimeEntry[];
  byProject: Record<number, number>;
  byActivity: Record<number, number>;
}

// Redmine API response types
export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
  created_on: string;
  last_login_on: string;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  status: number;
  is_public: boolean;
  created_on: string;
  updated_on: string;
}

export interface RedmineActivity {
  id: number;
  name: string;
  is_default: boolean;
  is_active: boolean;
}

export interface RedmineIssue {
  id: number;
  subject: string;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
}

export interface RedmineTimeEntry {
  id: number;
  project: { id: number; name: string };
  issue?: { id: number };
  activity: { id: number; name: string };
  user: { id: number; name: string };
  spent_on: string;
  hours: number;
  comments: string;
  created_on: string;
  updated_on: string;
}

// Form data types
export interface TimeEntryFormData {
  projectId: number;
  issueId?: number;
  activityId: number;
  date: string;
  hours: number;
  comments?: string;
}

// Redmine API payload types
export interface RedmineTimeEntryPayload {
  time_entry: {
    project_id: number;
    issue_id?: number;
    spent_on: string;
    hours: number;
    activity_id: number;
    comments: string;
  };
}

export interface BulkTimeEntryData {
  entries: TimeEntryFormData[];
}

// API response types
export interface RedmineResponse<T> {
  [key: string]: T[] | number | undefined;
  total_count?: number;
  offset?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class RedmineApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RedmineApiError';
  }
}
