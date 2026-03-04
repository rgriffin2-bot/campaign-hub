/**
 * CampaignProvider -- Central context for campaign selection and data.
 *
 * Loads the list of campaigns (DM only), the currently active campaign, and
 * available modules. Exposes helpers to switch, create, and reorder campaigns.
 * Both DM and player UIs consume this provider; the API endpoints are chosen
 * based on the user's role.
 */
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
  selectCampaign: (campaignId: string) => Promise<void>;
  createCampaign: (config: Partial<CampaignConfig>) => Promise<void>;
  reorderModules: (newOrder: string[]) => Promise<void>;
  enabledModules: ModuleInfo[];
  allModules: ModuleInfo[];
  getModuleSetting: <T>(moduleId: string, key: string) => T | undefined;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

// ── API fetch helpers ────────────────────────────────────────────────
// Each helper selects the DM or player endpoint based on the caller's role.

async function fetchCampaigns(isDm: boolean): Promise<CampaignMeta[]> {
  const endpoint = isDm ? '/api/campaigns' : '/api/player/campaigns';
  const res = await fetch(endpoint, { credentials: 'include' });
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

async function playerSelectCampaign(campaignId: string): Promise<CampaignConfig> {
  const res = await fetch(`/api/player/campaigns/${campaignId}/select`, {
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

  // When auth is disabled everyone is treated as DM
  const isDm = !authEnabled || role === 'dm';

  // ── Queries ────────────────────────────────────────────────────────
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

  // ── Mutations ───────────────────────────────────────────────────────
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

  // Sync local state when the server-side active campaign changes
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

  // Player campaign selection — stores choice in their session
  const selectCampaign = useCallback(
    async (campaignId: string) => {
      const data = await playerSelectCampaign(campaignId);
      setCampaign(data);
      queryClient.invalidateQueries({ queryKey: ['active-campaign'] });
    },
    [queryClient]
  );

  const createCampaignFn = useCallback(
    async (config: Partial<CampaignConfig>) => {
      await createMutation.mutateAsync(config);
    },
    [createMutation]
  );

  // Reorder modules with optimistic update; reverts on failure
  const reorderModules = useCallback(
    async (newOrder: string[]) => {
      if (!campaign) return;

      // Optimistically update local state
      setCampaign((prev) => prev ? { ...prev, modules: newOrder } : null);

      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: newOrder }),
          credentials: 'include',
        });

        const data = await res.json();
        if (!data.success) {
          // Revert on error
          setCampaign((prev) => prev ? { ...prev, modules: campaign.modules } : null);
          throw new Error(data.error);
        }

        // Update with server response
        setCampaign(data.data);
        queryClient.invalidateQueries({ queryKey: ['active-campaign'] });
      } catch (error) {
        // Revert on error
        setCampaign((prev) => prev ? { ...prev, modules: campaign.modules } : null);
        console.error('Failed to reorder modules:', error);
      }
    },
    [campaign, queryClient]
  );

  // ── Derived state ──────────────────────────────────────────────────
  // Resolve module IDs in campaign.modules to full ModuleInfo objects
  const enabledModules = campaign
    ? campaign.modules
        .map((id) => allModules.find((m) => m.id === id))
        .filter((m): m is ModuleInfo => m !== undefined)
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
    selectCampaign,
    createCampaign: createCampaignFn,
    reorderModules,
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

/** Hook to consume campaign data. Must be inside a CampaignProvider. */
export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
