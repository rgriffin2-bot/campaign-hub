import { useState, useEffect } from 'react';
import type { Faction } from '../types';

export function useFactions(campaignId: string | null) {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setFactions([]);
      return;
    }

    fetchFactions();
  }, [campaignId]);

  async function fetchFactions() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/faction`);

      if (!response.ok) {
        throw new Error('Failed to load factions');
      }

      const data = await response.json();
      setFactions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading factions:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    factions,
    loading,
    error,
    refetch: fetchFactions,
  };
}
