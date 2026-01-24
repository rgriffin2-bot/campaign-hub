import { useState, useEffect } from 'react';
import type { Location } from '../types';

export function useLocation(campaignId: string | null, locationId: string | null) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !locationId) {
      setLocation(null);
      return;
    }

    fetchLocation();
  }, [campaignId, locationId]);

  async function fetchLocation() {
    if (!campaignId || !locationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/location/${locationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load location');
      }

      const data = await response.json();
      setLocation(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading location:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateLocation(updates: Partial<Location>): Promise<boolean> {
    if (!campaignId || !locationId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/location/${locationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const updated = await response.json();
      setLocation(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating location:', err);
      return false;
    }
  }

  async function deleteLocation(): Promise<boolean> {
    if (!campaignId || !locationId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/location/${locationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting location:', err);
      return false;
    }
  }

  return {
    location,
    loading,
    error,
    updateLocation,
    deleteLocation,
    refetch: fetchLocation,
  };
}
