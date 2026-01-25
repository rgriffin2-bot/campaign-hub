import { useState, useEffect } from 'react';
import type { Session } from '../types';

export function useSessions(campaignId: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setSessions([]);
      return;
    }

    fetchSessions();
  }, [campaignId]);

  async function fetchSessions() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session`);

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
