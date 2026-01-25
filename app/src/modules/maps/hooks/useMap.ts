import { useState, useEffect } from 'react';
import type { MapEntry } from '../types';

export function useMap(campaignId: string | null, mapId: string | null) {
  const [map, setMap] = useState<MapEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setMap(null);
      return;
    }

    fetchMap();
  }, [campaignId, mapId]);

  async function fetchMap() {
    if (!campaignId || !mapId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/map/${mapId}`);

      if (!response.ok) {
        throw new Error('Failed to load map');
      }

      const data = await response.json();
      setMap(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading map:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateMap(updates: Partial<MapEntry>): Promise<boolean> {
    if (!campaignId || !mapId) return false;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/map/${mapId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update map');
      }

      const updated = await response.json();
      setMap(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating map:', err);
      return false;
    }
  }

  async function deleteMap(): Promise<boolean> {
    if (!campaignId || !mapId) return false;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/map/${mapId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete map');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting map:', err);
      return false;
    }
  }

  return {
    map,
    loading,
    error,
    updateMap,
    deleteMap,
    refetch: fetchMap,
  };
}
