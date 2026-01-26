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

async function fetchCampaigns(): Promise<CampaignMeta[]> {
  const res = await fetch('/api/campaigns');
  const data = await res.json();
  return data.data || [];
}

async function fetchActiveCampaign(): Promise<CampaignConfig | null> {
  const res = await fetch('/api/active-campaign');
  const data = await res.json();
  return data.data || null;
}

async function fetchModules(): Promise<ModuleInfo[]> {
  const res = await fetch('/api/modules');
  const data = await res.json();
  return data.data || [];
}

async function activateCampaign(campaignId: string): Promise<CampaignConfig> {
  const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
    method: 'POST',
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
  const [campaign, setCampaign] = useState<CampaignConfig | null>(null);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  const { data: activeCampaign, isLoading: activeLoading } = useQuery({
    queryKey: ['active-campaign'],
    queryFn: fetchActiveCampaign,
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: fetchModules,
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
