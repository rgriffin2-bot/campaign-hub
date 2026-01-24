import { useCampaign } from '@/core/context/CampaignContext';
import { ChevronDown } from 'lucide-react';

export function CampaignSelector() {
  const { campaigns, currentCampaign, selectCampaign, loading } = useCampaign();

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        Loading campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No campaigns found
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={currentCampaign?.id || ''}
        onChange={(e) => selectCampaign(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md appearance-none pr-8 cursor-pointer hover:bg-accent"
      >
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
