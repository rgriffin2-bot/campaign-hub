import { useState } from 'react';
import { useCampaign } from '@/core/context/CampaignContext';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/modules/locations/hooks/useLocations';
import { LocationList } from '@/modules/locations/components/LocationList';
import { MapModePanel } from './MapModePanel';

export function MapsLocationsDashboard() {
  const { currentCampaign } = useCampaign();
  const { locations, loading } = useLocations(currentCampaign?.id || null);
  const [mode, setMode] = useState<'database' | 'map'>('database');

  if (!currentCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a campaign first</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (mode === 'map') {
    return <MapModePanel locations={locations} onExit={() => setMode('database')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maps + Locations</h2>
          <p className="text-sm text-muted-foreground">
            Browse your location database or jump into Map Mode to visualize a solar system.
          </p>
        </div>
        <Button variant="outline" onClick={() => setMode('map')}>
          Enter Map Mode
        </Button>
      </div>

      <LocationList locations={locations} />
    </div>
  );
}
