import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useMaps } from '../hooks/useMaps';
import { useMap } from '../hooks/useMap';
import { MapList } from './MapList';
import { MapSheet } from './MapSheet';
import { MapEditor } from './MapEditor';
import type { MapEntry } from '../types';

interface MapDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function MapDashboard({ mode = 'list' }: MapDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { maps, loading: listLoading, refetch: refetchList } = useMaps(currentCampaign?.id || null);
  const {
    map,
    loading: mapLoading,
    updateMap,
    deleteMap,
  } = useMap(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<MapEntry>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/map`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create map');
        }

        await refetchList();
        return true;
      }

      return await updateMap(data);
    } catch (error) {
      console.error('Error saving map:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this map?')) {
      return;
    }

    const success = await deleteMap();
    if (success) {
      await refetchList();
      navigate('/maps');
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

    return <MapList maps={maps} />;
  }

  if (mode === 'new') {
    return <MapEditor onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (mapLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!map) {
      return <div className="flex items-center justify-center h-64">Map not found</div>;
    }

    return <MapEditor mapEntry={map} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (mapLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!map) {
      return <div className="flex items-center justify-center h-64">Map not found</div>;
    }

    return <MapSheet mapEntry={map} onDelete={handleDelete} />;
  }

  return null;
}
