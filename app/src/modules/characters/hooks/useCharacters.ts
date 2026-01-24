import { useState, useEffect } from 'react';
import type { Character } from '../types';

export function useCharacters(campaignId: string | null) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setCharacters([]);
      return;
    }

    fetchCharacters();
  }, [campaignId]);

  async function fetchCharacters() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/character`);

      if (!response.ok) {
        throw new Error('Failed to load characters');
      }

      const data = await response.json();
      setCharacters(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading characters:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    characters,
    loading,
    error,
    refetch: fetchCharacters,
  };
}
