import { useState, useEffect } from 'react';
import type { Location } from '../types';

export function useLocations(campaignId: string | null) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLocations([]);
      return;
    }

    fetchLocations();
  }, [campaignId]);

  async function fetchLocations() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/location`);

      if (!response.ok) {
        throw new Error('Failed to load locations');
      }

      const data = await response.json();
      setLocations(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
  };
}
