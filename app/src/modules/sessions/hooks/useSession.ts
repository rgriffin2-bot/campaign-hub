import { useState, useEffect } from 'react';
import type { Session } from '../types';

export function useSession(campaignId: string | null, sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !sessionId) {
      setSession(null);
      return;
    }

    fetchSession();
  }, [campaignId, sessionId]);

  async function fetchSession() {
    if (!campaignId || !sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/session/${sessionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      setSession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateSession(updates: Partial<Session>): Promise<boolean> {
    if (!campaignId || !sessionId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/session/${sessionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      const updated = await response.json();
      setSession(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating session:', err);
      return false;
    }
  }

  async function deleteSession(): Promise<boolean> {
    if (!campaignId || !sessionId) return false;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/session/${sessionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting session:', err);
      return false;
    }
  }

  return {
    session,
    loading,
    error,
    updateSession,
    deleteSession,
    refetch: fetchSession,
  };
}
