import { useState, useEffect } from 'react';
import type { Faction } from '../types';

export function useFaction(campaignId: string | null, factionId: string | null) {
  const [faction, setFaction] = useState<Faction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !factionId) {
      setFaction(null);
      return;
    }

    fetchFaction();
  }, [campaignId, factionId]);

  async function fetchFaction() {
    if (!campaignId || !factionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/faction/${factionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load faction');
      }

      const data = await response.json();
      setFaction(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading faction:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateFaction(updates: Partial<Faction>): Promise<boolean> {
    if (!campaignId || !factionId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/faction/${factionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update faction');
      }

      const updated = await response.json();
      setFaction(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating faction:', err);
      return false;
    }
  }

  async function deleteFaction(): Promise<boolean> {
    if (!campaignId || !factionId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/faction/${factionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete faction');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting faction:', err);
      return false;
    }
  }

  return {
    faction,
    loading,
    error,
    updateFaction,
    deleteFaction,
    refetch: fetchFaction,
  };
}
