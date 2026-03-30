/**
 * API client for communicating with the backend
 */

interface LocationStatus {
  current: string;
  currentEvent: string | null;
  currentStartTime: string | null;
  currentEndTime: string | null;
  next: string | null;
  nextEvent: string | null;
  nextStartTime: string | null;
  nextEndTime: string | null;
  timeUntilChange: string;
  lastUpdated: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}

interface CalendarResponse {
  total: number;
  events: CalendarEvent[];
}

interface SyncStatus {
  status: string;
  lastSyncTime: string | null;
  nextSyncTime: string | null;
  errorMessage: string | null;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

class APIClient {
  private baseURL: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 30000; // 30 seconds

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Make a GET request to the API
   */
  private async request<T>(
    endpoint: string,
    useCache: boolean = true
  ): Promise<T> {
    // Check cache
    if (useCache && this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/api${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      if (useCache) {
        this.cache.set(endpoint, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (error) {
      console.error(`[ERROR] API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get location status (current and next)
   */
  async getLocationStatus(useCache: boolean = false): Promise<LocationStatus> {
    return this.request<LocationStatus>('/location', useCache);
  }

  /**
   * Get current location only
   */
  async getCurrentLocation(useCache: boolean = false) {
    return this.request('/location/current', useCache);
  }

  /**
   * Get next location only
   */
  async getNextLocation(useCache: boolean = false) {
    return this.request('/location/next', useCache);
  }

  /**
   * Get location history
   */
  async getLocationHistory(days: number = 30) {
    return this.request(`/location/history?days=${days}`, false);
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(limit: number = 50): Promise<CalendarResponse> {
    return this.request<CalendarResponse>(`/calendar/events?limit=${limit}`, true);
  }

  /**
   * Get calendar sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return this.request<SyncStatus>('/calendar/sync-status', false);
  }

  /**
   * Manually trigger calendar sync
   */
  async syncCalendar() {
    try {
      const response = await fetch(`${this.baseURL}/api/calendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      // Clear cache after sync
      this.cache.clear();

      return await response.json();
    } catch (error) {
      console.error('[ERROR] Calendar sync failed:', error);
      throw error;
    }
  }

  /**
   * Get server config
   */
  async getConfig() {
    return this.request('/config', true);
  }

  /**
   * Get server health
   */
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health', false);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(endpoint: string): void {
    this.cache.delete(endpoint);
  }
}

// Create and export default client instance
const client = new APIClient();
export default client;
