import { useState, useEffect } from 'react';
import type { LoreEntry } from '../types';

export function useLoreEntry(campaignId: string | null, loreId: string | null) {
  const [loreEntry, setLoreEntry] = useState<LoreEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !loreId) {
      setLoreEntry(null);
      return;
    }

    fetchLoreEntry();
  }, [campaignId, loreId]);

  async function fetchLoreEntry() {
    if (!campaignId || !loreId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/lore/${loreId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load lore entry');
      }

      const data = await response.json();
      setLoreEntry(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading lore entry:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateLoreEntry(updates: Partial<LoreEntry>): Promise<boolean> {
    if (!campaignId || !loreId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/lore/${loreId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update lore entry');
      }

      const updated = await response.json();
      setLoreEntry(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating lore entry:', err);
      return false;
    }
  }

  async function deleteLoreEntry(): Promise<boolean> {
    if (!campaignId || !loreId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/lore/${loreId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete lore entry');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting lore entry:', err);
      return false;
    }
  }

  return {
    loreEntry,
    loading,
    error,
    updateLoreEntry,
    deleteLoreEntry,
    refetch: fetchLoreEntry,
  };
}
