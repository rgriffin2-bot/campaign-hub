import { useState, useEffect } from 'react';
import type { Character } from '../types';

export function useCharacter(campaignId: string | null, characterId: string | null) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !characterId) {
      setCharacter(null);
      return;
    }

    fetchCharacter();
  }, [campaignId, characterId]);

  async function fetchCharacter() {
    if (!campaignId || !characterId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/character/${characterId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load character');
      }

      const data = await response.json();
      setCharacter(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading character:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateCharacter(updates: Partial<Character>): Promise<boolean> {
    if (!campaignId || !characterId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/character/${characterId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update character');
      }

      const updated = await response.json();
      setCharacter(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating character:', err);
      return false;
    }
  }

  async function deleteCharacter(): Promise<boolean> {
    if (!campaignId || !characterId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/character/${characterId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete character');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting character:', err);
      return false;
    }
  }

  return {
    character,
    loading,
    error,
    updateCharacter,
    deleteCharacter,
    refetch: fetchCharacter,
  };
}
