import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useCampaign } from './CampaignProvider';
import { useAuth } from './AuthProvider';

// Polling interval for live updates (3 seconds)
const POLL_INTERVAL = 3000;

export type Disposition = 'hostile' | 'friendly' | 'neutral';

export interface SceneNPC {
  id: string;
  name: string;
  occupation?: string;
  portrait?: string;
  portraitPosition?: { x: number; y: number; scale: number };
  hasStats?: boolean;
  disposition?: Disposition;
  stats?: {
    damage?: number;
    maxDamage?: number;
    armor?: number;
    moves?: string;
  };
  visibleToPlayers?: boolean;
  // Backwards compatibility
  isAntagonist?: boolean;
  antagonistStats?: {
    damage?: number;
    maxDamage?: number;
    armor?: number;
    moves?: string;
  };
}

interface SceneNPCsContextValue {
  sceneNPCs: SceneNPC[];
  isLoading: boolean;
  addToScene: (npc: SceneNPC) => void;
  removeFromScene: (npcId: string) => void;
  isInScene: (npcId: string) => boolean;
  clearScene: () => void;
  updateNPCStats: (npcId: string, updates: Partial<SceneNPC['stats']>) => void;
  updateDisposition: (npcId: string, disposition: Disposition) => void;
  toggleVisibility: (npcId: string) => void;
}

const SceneNPCsContext = createContext<SceneNPCsContextValue | null>(null);

export function SceneNPCsProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaign();
  const { role, authEnabled } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Determine if we're in player mode based on route
  // Player routes start with /player, even if user has DM role
  const isPlayerRoute = location.pathname.startsWith('/player');

  // Determine if user should see DM data:
  // - Must not be on a player route
  // - Must either have auth disabled OR be logged in as DM
  const isDm = !isPlayerRoute && (!authEnabled || role === 'dm');

  // Use different endpoints for DM vs player
  const endpoint = isDm
    ? '/api/modules/live-play/scene-npcs'
    : '/api/player/scene-npcs';

  // Fetch scene NPCs with polling
  const { data: sceneNPCs = [], isLoading } = useQuery({
    queryKey: ['scene-npcs', campaign?.id, isDm],
    queryFn: async () => {
      if (!campaign) return [];
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data || [];
    },
    enabled: !!campaign,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });

  // Mutation for adding NPC to scene (DM only)
  const addMutation = useMutation({
    mutationFn: async (npc: SceneNPC) => {
      const res = await fetch('/api/modules/live-play/scene-npcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(npc),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newNPCs) => {
      queryClient.setQueryData(['scene-npcs', campaign?.id, isDm], newNPCs);
    },
  });

  // Mutation for removing NPC from scene (DM only)
  const removeMutation = useMutation({
    mutationFn: async (npcId: string) => {
      const res = await fetch(`/api/modules/live-play/scene-npcs/${npcId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newNPCs) => {
      queryClient.setQueryData(['scene-npcs', campaign?.id, isDm], newNPCs);
    },
  });

  // Mutation for updating NPC stats (DM only)
  const updateMutation = useMutation({
    mutationFn: async ({ npcId, updates }: { npcId: string; updates: Partial<SceneNPC> }) => {
      const res = await fetch(`/api/modules/live-play/scene-npcs/${npcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newNPCs) => {
      queryClient.setQueryData(['scene-npcs', campaign?.id, isDm], newNPCs);
    },
  });

  // Mutation for clearing scene (DM only)
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/modules/live-play/scene-npcs', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.setQueryData(['scene-npcs', campaign?.id, isDm], []);
    },
  });

  const addToScene = useCallback((npc: SceneNPC) => {
    if (!isDm) return; // Only DM can add
    addMutation.mutate(npc);
  }, [addMutation, isDm]);

  const removeFromScene = useCallback((npcId: string) => {
    if (!isDm) return; // Only DM can remove
    removeMutation.mutate(npcId);
  }, [removeMutation, isDm]);

  const isInScene = useCallback(
    (npcId: string) => {
      return sceneNPCs.some((n: SceneNPC) => n.id === npcId);
    },
    [sceneNPCs]
  );

  const clearScene = useCallback(() => {
    if (!isDm) return; // Only DM can clear
    clearMutation.mutate();
  }, [clearMutation, isDm]);

  const updateNPCStats = useCallback(
    (npcId: string, updates: Partial<SceneNPC['stats']>) => {
      if (!isDm) return; // Only DM can update
      updateMutation.mutate({
        npcId,
        updates: { stats: updates },
      });
    },
    [updateMutation, isDm]
  );

  const updateDisposition = useCallback(
    (npcId: string, disposition: Disposition) => {
      if (!isDm) return; // Only DM can update disposition
      updateMutation.mutate({
        npcId,
        updates: { disposition },
      });
    },
    [updateMutation, isDm]
  );

  const toggleVisibility = useCallback(
    (npcId: string) => {
      if (!isDm) return; // Only DM can toggle visibility
      const npc = sceneNPCs.find((n: SceneNPC) => n.id === npcId);
      if (npc) {
        updateMutation.mutate({
          npcId,
          updates: { visibleToPlayers: npc.visibleToPlayers === false ? true : false },
        });
      }
    },
    [updateMutation, isDm, sceneNPCs]
  );

  return (
    <SceneNPCsContext.Provider
      value={{
        sceneNPCs,
        isLoading,
        addToScene,
        removeFromScene,
        isInScene,
        clearScene,
        updateNPCStats,
        updateDisposition,
        toggleVisibility,
      }}
    >
      {children}
    </SceneNPCsContext.Provider>
  );
}

export function useSceneNPCs() {
  const context = useContext(SceneNPCsContext);
  if (!context) {
    throw new Error('useSceneNPCs must be used within a SceneNPCsProvider');
  }
  return context;
}
