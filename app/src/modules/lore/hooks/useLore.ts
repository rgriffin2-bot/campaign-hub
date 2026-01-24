import { useState, useEffect } from 'react';
import type { LoreEntry } from '../types';

export function useLore(campaignId: string | null) {
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLoreEntries([]);
      return;
    }

    fetchLore();
  }, [campaignId]);

  async function fetchLore() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/lore`);

      if (!response.ok) {
        throw new Error('Failed to load lore');
      }

      const data = await response.json();
      setLoreEntries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading lore:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    loreEntries,
    loading,
    error,
    refetch: fetchLore,
  };
}
