import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CampaignConfig, CampaignMeta } from '@shared/types/campaign';
import type { ModuleInfo } from '@shared/types/module';
import { useAuth } from './AuthProvider';

interface CampaignContextValue {
  campaign: CampaignConfig | null;
  isLoading: boolean;
  campaigns: CampaignMeta[];
  switchCampaign: (campaignId: string) => Promise<void>;
  createCampaign: (config: Partial<CampaignConfig>) => Promise<void>;
  enabledModules: ModuleInfo[];
  allModules: ModuleInfo[];
  getModuleSetting: <T>(moduleId: string, key: string) => T | undefined;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

// Fetch functions that use the appropriate API base path
async function fetchCampaigns(isDm: boolean): Promise<CampaignMeta[]> {
  // Only DMs can list all campaigns
  if (!isDm) return [];
  const res = await fetch('/api/campaigns', { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function fetchActiveCampaign(isDm: boolean): Promise<CampaignConfig | null> {
  // Use player endpoint for players, DM endpoint for DMs
  const endpoint = isDm ? '/api/active-campaign' : '/api/player/active-campaign';
  const res = await fetch(endpoint, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

async function fetchModules(isDm: boolean): Promise<ModuleInfo[]> {
  const endpoint = isDm ? '/api/modules' : '/api/player/modules';
  const res = await fetch(endpoint, { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function activateCampaign(campaignId: string): Promise<CampaignConfig> {
  const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function createCampaignApi(
  config: Partial<CampaignConfig>
): Promise<CampaignConfig> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

interface CampaignProviderProps {
  children: ReactNode;
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const queryClient = useQueryClient();
  const { role, authenticated, authEnabled } = useAuth();
  const [campaign, setCampaign] = useState<CampaignConfig | null>(null);

  // Determine if user has DM access
  const isDm = !authEnabled || role === 'dm';

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', isDm],
    queryFn: () => fetchCampaigns(isDm),
    enabled: authenticated || !authEnabled,
  });

  const { data: activeCampaign, isLoading: activeLoading } = useQuery({
    queryKey: ['active-campaign', isDm],
    queryFn: () => fetchActiveCampaign(isDm),
    enabled: authenticated || !authEnabled,
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['modules', isDm],
    queryFn: () => fetchModules(isDm),
    enabled: authenticated || !authEnabled,
  });

  const activateMutation = useMutation({
    mutationFn: activateCampaign,
    onSuccess: (data) => {
      setCampaign(data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: createCampaignApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      activateMutation.mutate(data.id);
    },
  });

  useEffect(() => {
    if (activeCampaign) {
      setCampaign(activeCampaign);
    }
  }, [activeCampaign]);

  const switchCampaign = useCallback(
    async (campaignId: string) => {
      await activateMutation.mutateAsync(campaignId);
    },
    [activateMutation]
  );

  const createCampaignFn = useCallback(
    async (config: Partial<CampaignConfig>) => {
      await createMutation.mutateAsync(config);
    },
    [createMutation]
  );

  const enabledModules = campaign
    ? allModules.filter((m) => campaign.modules.includes(m.id))
    : [];

  const getModuleSetting = useCallback(
    <T,>(moduleId: string, key: string): T | undefined => {
      return campaign?.moduleSettings?.[moduleId]?.[key] as T | undefined;
    },
    [campaign]
  );

  const value: CampaignContextValue = {
    campaign,
    isLoading: campaignsLoading || activeLoading,
    campaigns,
    switchCampaign,
    createCampaign: createCampaignFn,
    enabledModules,
    allModules,
    getModuleSetting,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
