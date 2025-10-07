import { RedmineApiError } from '../types';
import { logError } from '@/lib/sentry';

export class RedmineService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-Redmine-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        
        // Log API errors to Sentry with context
        logError(new Error(`Redmine API error: ${response.status}`), {
          tags: {
            endpoint,
            status: response.status.toString(),
            errorType: 'redmine_api',
          },
          extra: {
            responseBody: responseText,
            url,
          },
          level: response.status >= 500 ? 'error' : 'warning',
        });
        
        if (response.status === 401) {
          throw new RedmineApiError(
            'Invalid API key or unauthorized access',
            401,
            'UNAUTHORIZED'
          );
        }
        if (response.status === 404) {
          throw new RedmineApiError(
            `Resource not found: ${endpoint}`,
            404,
            'NOT_FOUND'
          );
        }
        if (response.status === 422) {
          let errorData: { errors?: string[]; message?: string } = {};
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { message: responseText };
          }
          throw new RedmineApiError(
            'Validation error: ' + (errorData.errors?.join(', ') || 'Invalid data'),
            422,
            'VALIDATION_ERROR',
            errorData
          );
        }
        if (response.status >= 500) {
          throw new RedmineApiError(
            'Redmine server error',
            response.status,
            'SERVER_ERROR'
          );
        }
        throw new RedmineApiError(
          `Redmine API error: ${response.status} ${response.statusText}`,
          response.status,
          'API_ERROR'
        );
      }

      return await response.json();
    } catch (error) {
      // Only log unexpected errors (not RedmineApiError which we already logged above)
      if (!(error instanceof RedmineApiError)) {
        logError(error instanceof Error ? error : new Error(String(error)), {
          tags: {
            endpoint,
            errorType: 'redmine_request',
          },
          extra: {
            url: `${this.baseUrl}${endpoint}`,
          },
        });
      }
      
      if (error instanceof RedmineApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new RedmineApiError(
          'Network error: Unable to connect to Redmine',
          0,
          'NETWORK_ERROR'
        );
      }
      throw new RedmineApiError(
        'Unexpected error occurred',
        0,
        'UNKNOWN_ERROR',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async getProjects() {
    return this.makeRequest('/projects.json');
  }

  async getActivities() {
    return this.makeRequest('/enumerations/time_entry_activities.json');
  }

  async getIssues(projectId: number, limit: number = 100) {
    const params = new URLSearchParams();
    params.append('project_id', projectId.toString());
    params.append('status_id', 'open');
    params.append('limit', limit.toString());
    params.append('sort', 'updated_on:desc');
    
    return this.makeRequest(`/issues.json?${params.toString()}`);
  }

  async getIssue(issueId: number) {
    return this.makeRequest(`/issues/${issueId}.json`);
  }

  async getTimeEntries(userId?: number, from?: string, to?: string, limit: number = 100) {
    let endpoint = '/time_entries.json';
    const params = new URLSearchParams();
    
    if (userId) params.append('user_id', userId.toString());
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    params.append('limit', limit.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest(endpoint);
  }

  async createTimeEntry(timeEntry: { time_entry: Record<string, unknown> }) {
    return this.makeRequest('/time_entries.json', {
      method: 'POST',
      body: JSON.stringify(timeEntry),
    });
  }

  async updateTimeEntry(id: number, timeEntry: { time_entry: Record<string, unknown> }) {
    return this.makeRequest(`/time_entries/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify(timeEntry),
    });
  }

  async deleteTimeEntry(id: number) {
    return this.makeRequest(`/time_entries/${id}.json`, {
      method: 'DELETE',
    });
  }

  async getCurrentUser() {
    return this.makeRequest('/my/account.json');
  }
}
