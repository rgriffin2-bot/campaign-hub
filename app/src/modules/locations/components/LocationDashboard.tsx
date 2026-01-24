import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '@/core/context/CampaignContext';
import { useLocations } from '../hooks/useLocations';
import { useLocation } from '../hooks/useLocation';
import { LocationList } from './LocationList';
import { LocationSheet } from './LocationSheet';
import { LocationEditor } from './LocationEditor';
import type { Location } from '../types';

interface LocationDashboardProps {
  mode?: 'list' | 'detail' | 'edit' | 'new';
}

export function LocationDashboard({ mode = 'list' }: LocationDashboardProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const { id } = useParams<{ id: string }>();

  const { locations, loading: listLoading, refetch: refetchList } = useLocations(currentCampaign?.id || null);
  const {
    location,
    loading: locLoading,
    updateLocation,
    deleteLocation,
  } = useLocation(currentCampaign?.id || null, id || null);

  async function handleSave(data: Partial<Location>): Promise<boolean> {
    if (!currentCampaign) return false;

    try {
      if (mode === 'new') {
        // Create new location
        const response = await fetch(
          `/api/campaigns/${currentCampaign.id}/location`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create location');
        }

        // Refetch the list to show the new location
        await refetchList();
        return true;
      } else {
        // Update existing
        return await updateLocation(data);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      return false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    const success = await deleteLocation();
    if (success) {
      await refetchList();
      navigate('/locations');
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

    return <LocationList locations={locations} />;
  }

  if (mode === 'new') {
    return <LocationEditor allLocations={locations} onSave={handleSave} />;
  }

  if (mode === 'edit') {
    if (locLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!location) {
      return <div className="flex items-center justify-center h-64">Location not found</div>;
    }

    return <LocationEditor location={location} allLocations={locations} onSave={handleSave} />;
  }

  if (mode === 'detail') {
    if (locLoading) {
      return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    if (!location) {
      return <div className="flex items-center justify-center h-64">Location not found</div>;
    }

    return <LocationSheet location={location} allLocations={locations} onDelete={handleDelete} />;
  }

  return null;
}
