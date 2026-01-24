import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useLore } from '../hooks/useLore';
import { useLoreEntry } from '../hooks/useLoreEntry';
import { LoreList } from './LoreList';
import { LoreSheet } from './LoreSheet';
import { LoreEditor } from './LoreEditor';
import type { LoreEntry } from '../types';

interface LoreDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function LoreDashboard({ mode = 'list' }: LoreDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { loreEntries, loading: listLoading, refetch: refetchList } = useLore(currentCampaign?.id || null);
  const {
    loreEntry,
    loading: entryLoading,
    updateLoreEntry,
    deleteLoreEntry,
  } = useLoreEntry(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<LoreEntry>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        // Create new lore entry
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/lore`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create lore entry');
        }

        // Refetch the list to show the new lore entry
        await refetchList();
        return true;
      } else {
        // Update existing
        return await updateLoreEntry(data);
      }
    } catch (error) {
      console.error('Error saving lore entry:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this lore entry?')) {
      return;
    }

    const success = await deleteLoreEntry();
    if (success) {
      navigate('/lore');
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

    return <LoreList loreEntries={loreEntries} />;
  }

  if (mode === 'new') {
    return <LoreEditor onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (entryLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!loreEntry) {
      return <div className="flex items-center justify-center h-64">Lore entry not found</div>;
    }

    return <LoreEditor loreEntry={loreEntry} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (entryLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!loreEntry) {
      return <div className="flex items-center justify-center h-64">Lore entry not found</div>;
    }

    return <LoreSheet loreEntry={loreEntry} onDelete={handleDelete} />;
  }

  return null;
}
