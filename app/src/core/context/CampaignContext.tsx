import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Campaign } from '../types';

interface CampaignContextType {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  loading: boolean;
  error: string | null;
  selectCampaign: (campaignId: string) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

interface CampaignProviderProps {
  children: ReactNode;
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load campaigns on mount
  useEffect(() => {
    refreshCampaigns();
  }, []);

  // Load stored campaign selection on mount
  useEffect(() => {
    const storedCampaignId = localStorage.getItem('currentCampaignId');
    if (storedCampaignId && campaigns.length > 0) {
      selectCampaign(storedCampaignId);
    } else if (campaigns.length > 0 && !currentCampaign) {
      // Auto-select first campaign if none selected
      selectCampaign(campaigns[0].id);
    }
  }, [campaigns]);

  async function refreshCampaigns() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns');

      if (!response.ok) {
        throw new Error('Failed to load campaigns');
      }

      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  async function selectCampaign(campaignId: string) {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);

      if (!response.ok) {
        throw new Error(`Failed to load campaign ${campaignId}`);
      }

      const campaign = await response.json();
      setCurrentCampaign(campaign);
      localStorage.setItem('currentCampaignId', campaignId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error selecting campaign:', err);
    }
  }

  const value: CampaignContextType = {
    campaigns,
    currentCampaign,
    loading,
    error,
    selectCampaign,
    refreshCampaigns,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);

  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }

  return context;
}
