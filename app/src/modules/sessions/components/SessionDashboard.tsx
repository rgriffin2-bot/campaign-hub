import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useSessions } from '../hooks/useSessions';
import { useSession } from '../hooks/useSession';
import { SessionList } from './SessionList';
import { SessionSheet } from './SessionSheet';
import { SessionEditor } from './SessionEditor';
import type { Session } from '../types';

interface SessionDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function SessionDashboard({ mode = 'list' }: SessionDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { sessions, loading: listLoading, refetch: refetchList } = useSessions(currentCampaign?.id || null);
  const {
    session,
    loading: sessionLoading,
    updateSession,
    deleteSession,
  } = useSession(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<Session>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/session`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create session');
        }

        await refetchList();
        return true;
      }

      return await updateSession(data);
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    const success = await deleteSession();
    if (success) {
      await refetchList();
      navigate('/sessions');
    }
  }

  if (!currentCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a campaign first</p>
      </div>
    );
  }

  if (mode === 'list') {
    if (listLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return <SessionList sessions={sessions} />;
  }

  if (mode === 'new') {
    return <SessionEditor onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (sessionLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!session) {
      return <div className="flex items-center justify-center h-64">Session not found</div>;
    }

    return <SessionEditor session={session} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (sessionLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!session) {
      return <div className="flex items-center justify-center h-64">Session not found</div>;
    }

    return <SessionSheet session={session} onDelete={handleDelete} />;
  }

  return null;
}
