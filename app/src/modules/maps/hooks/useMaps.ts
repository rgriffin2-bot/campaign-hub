import { useState, useEffect } from 'react';
import type { MapEntry } from '../types';

export function useMaps(campaignId: string | null) {
  const [maps, setMaps] = useState<MapEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setMaps([]);
      return;
    }

    fetchMaps();
  }, [campaignId]);

  async function fetchMaps() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/map`);

      if (!response.ok) {
        throw new Error('Failed to load maps');
      }

      const data = await response.json();
      setMaps(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading maps:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    maps,
    loading,
    error,
    refetch: fetchMaps,
  };
}
