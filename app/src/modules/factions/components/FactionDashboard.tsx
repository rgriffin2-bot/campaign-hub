import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useFactions } from '../hooks/useFactions';
import { useFaction } from '../hooks/useFaction';
import { FactionList } from './FactionList';
import { FactionSheet } from './FactionSheet';
import { FactionEditor } from './FactionEditor';
import type { Faction } from '../types';

interface FactionDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function FactionDashboard({ mode = 'list' }: FactionDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { factions, loading: listLoading, refetch: refetchList } = useFactions(currentCampaign?.id || null);
  const {
    faction,
    loading: factionLoading,
    updateFaction,
    deleteFaction,
  } = useFaction(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<Faction>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/faction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create faction');
        }

        await refetchList();
        return true;
      }

      return await updateFaction(data);
    } catch (error) {
      console.error('Error saving faction:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this faction?')) {
      return;
    }

    const success = await deleteFaction();
    if (success) {
      await refetchList();
      navigate('/factions');
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

    return <FactionList factions={factions} />;
  }

  if (mode === 'new') {
    return <FactionEditor onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (factionLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!faction) {
      return <div className="flex items-center justify-center h-64">Faction not found</div>;
    }

    return <FactionEditor faction={faction} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (factionLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!faction) {
      return <div className="flex items-center justify-center h-64">Faction not found</div>;
    }

    return <FactionSheet faction={faction} onDelete={handleDelete} />;
  }

  return null;
}
