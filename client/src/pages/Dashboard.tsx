import React, { useEffect, useState } from 'react';
import client from '../api/client';

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

interface SyncStatus {
  status: string;
  lastSyncTime: string | null;
  errorMessage: string | null;
}

export default function Dashboard() {
  const [location, setLocation] = useState<LocationStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch location status from API
   */
  const fetchLocationStatus = async () => {
    try {
      setError(null);
      const data = await client.getLocationStatus();
      setLocation(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch location';
      setError(errorMessage);
      console.error('Location fetch error:', err);
    }
  };

  /**
   * Fetch sync status
   */
  const fetchSyncStatus = async () => {
    try {
      const data = await client.getSyncStatus();
      setSyncStatus(data);
    } catch (err) {
      console.error('Sync status fetch error:', err);
    }
  };

  /**
   * Format date to readable time
   */
  const formatTime = (isoString: string | null): string => {
    if (!isoString) return 'Unknown';
    try {
      const date = new Date(isoString);
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return isoString;
    }
  };

  /**
   * Format relative date (e.g., "in 2 days")
   */
  const formatRelativeDate = (isoString: string | null): string => {
    if (!isoString) return 'Unknown';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();

      if (diffMs < 0) return 'In the past';

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return `in ${days} day${days > 1 ? 's' : ''} ${hours}h`;
      if (hours > 0) {
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `in ${hours}h ${minutes}m`;
      }

      const minutes = Math.floor(diffMs / (1000 * 60));
      return `in ${minutes}m`;
    } catch {
      return 'Soon';
    }
  };

  /**
   * Handle manual sync
   */
  const handleManualSync = async () => {
    try {
      setError(null);
      await client.syncCalendar();
      // Refetch after sync
      await Promise.all([fetchLocationStatus(), fetchSyncStatus()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchLocationStatus();
    fetchSyncStatus();
    setLoading(false);

    // Poll for location updates every 30 seconds
    const locationInterval = setInterval(fetchLocationStatus, 30000);

    // Poll for sync status every 60 seconds
    const syncInterval = setInterval(fetchSyncStatus, 60000);

    return () => {
      clearInterval(locationInterval);
      clearInterval(syncInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Loading location data...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container" style={{ marginTop: '2rem' }}>
        <div className="error-message">
          <strong>Error:</strong> Failed to load location data. Please check your internet connection.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container" style={{ marginTop: '2rem' }}>
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Current Location */}
        <div className="card">
          <div className="location-section current">
            <div className="location-label">📍 Current Location</div>
            <div className="location-value">{location.current}</div>
            {location.currentEvent && (
              <div className="location-details">
                <p>
                  <strong>Event:</strong> {location.currentEvent}
                </p>
                {location.currentStartTime && location.currentEndTime && (
                  <p>
                    <strong>Until:</strong> {formatTime(location.currentEndTime)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Next Location */}
        {location.next ? (
          <div className="card">
            <div className="location-section next">
              <div className="location-label">🔜 Next Location</div>
              <div className="location-value">{location.next}</div>
              <div className="location-details">
                {location.nextEvent && (
                  <p>
                    <strong>Event:</strong> {location.nextEvent}
                  </p>
                )}
                {location.nextStartTime && (
                  <p>
                    <strong>Starting:</strong> {formatTime(location.nextStartTime)} ({formatRelativeDate(location.nextStartTime)})
                  </p>
                )}
              </div>
              <div className="time-until">⏱️ {location.timeUntilChange}</div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="location-section">
              <div className="location-label">🔜 Next Location</div>
              <div className="location-value">No future events scheduled</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <div className="card-title">⚡ Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              View Full Calendar
            </a>
            <button onClick={handleManualSync} className="btn btn-secondary">
              Sync Calendar Now
            </button>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="card">
            <div className="card-title">🔄 Sync Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div className="card-subtitle">Status</div>
                <span className={`status-badge ${syncStatus.status === 'idle' ? 'success' : syncStatus.status === 'error' ? 'error' : 'info'}`}>
                  {syncStatus.status}
                </span>
              </div>
              <div>
                <div className="card-subtitle">Last Sync</div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  {syncStatus.lastSyncTime ? formatTime(syncStatus.lastSyncTime) : 'Never'}
                </p>
              </div>
            </div>
            {syncStatus.errorMessage && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
                  <strong>Error:</strong> {syncStatus.errorMessage}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', marginTop: '2rem' }}>
          <p>Last updated: {location.lastUpdated ? formatTime(location.lastUpdated) : 'Just now'}</p>
        </div>
      </div>
    </div>
  );
}
