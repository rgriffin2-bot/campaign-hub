import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useCampaign } from './CampaignProvider';
import { useAuth } from './AuthProvider';
import type { ShipDisposition } from '@shared/schemas/ship';
import type { SceneShip } from '@shared/types/scene';

// Re-export type for consumers
export type { SceneShip };

// Polling interval for live updates (3 seconds)
const POLL_INTERVAL = 3000;

interface SceneShipsContextValue {
  sceneShips: SceneShip[];
  isLoading: boolean;
  addToScene: (ship: SceneShip) => void;
  removeFromScene: (shipId: string) => void;
  isInScene: (shipId: string) => boolean;
  clearScene: () => void;
  updateShip: (shipId: string, updates: Partial<SceneShip>) => void;
  updateDisposition: (shipId: string, disposition: ShipDisposition) => void;
  toggleVisibility: (shipId: string) => void;
}

const SceneShipsContext = createContext<SceneShipsContextValue | null>(null);

export function SceneShipsProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaign();
  const { role, authEnabled } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Determine if we're in player mode based on route
  const isPlayerRoute = location.pathname.startsWith('/player');

  // Determine if user should see DM data
  const isDm = !isPlayerRoute && (!authEnabled || role === 'dm');

  // Use different endpoints for DM vs player
  const endpoint = isDm
    ? '/api/modules/live-play/scene-ships'
    : '/api/player/scene-ships';

  // Fetch scene ships with polling
  const { data: sceneShips = [], isLoading } = useQuery({
    queryKey: ['scene-ships', campaign?.id, isDm],
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

  // Mutation for adding ship to scene (DM only)
  const addMutation = useMutation({
    mutationFn: async (ship: SceneShip) => {
      const res = await fetch('/api/modules/live-play/scene-ships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ship),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newShips) => {
      queryClient.setQueryData(['scene-ships', campaign?.id, isDm], newShips);
    },
  });

  // Mutation for removing ship from scene (DM only)
  const removeMutation = useMutation({
    mutationFn: async (shipId: string) => {
      const res = await fetch(`/api/modules/live-play/scene-ships/${shipId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newShips) => {
      queryClient.setQueryData(['scene-ships', campaign?.id, isDm], newShips);
    },
  });

  // Mutation for updating ship (DM only, or players for crew ships)
  const updateMutation = useMutation({
    mutationFn: async ({ shipId, updates }: { shipId: string; updates: Partial<SceneShip> }) => {
      const res = await fetch(`/api/modules/live-play/scene-ships/${shipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newShips) => {
      queryClient.setQueryData(['scene-ships', campaign?.id, isDm], newShips);
    },
  });

  // Mutation for clearing scene (DM only)
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/modules/live-play/scene-ships', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.setQueryData(['scene-ships', campaign?.id, isDm], []);
    },
  });

  const addToScene = useCallback((ship: SceneShip) => {
    if (!isDm) return;
    addMutation.mutate(ship);
  }, [addMutation, isDm]);

  const removeFromScene = useCallback((shipId: string) => {
    if (!isDm) return;
    removeMutation.mutate(shipId);
  }, [removeMutation, isDm]);

  const isInScene = useCallback(
    (shipId: string) => {
      return sceneShips.some((s: SceneShip) => s.id === shipId);
    },
    [sceneShips]
  );

  const clearScene = useCallback(() => {
    if (!isDm) return;
    clearMutation.mutate();
  }, [clearMutation, isDm]);

  const updateShip = useCallback(
    (shipId: string, updates: Partial<SceneShip>) => {
      // Players can update crew ships, DM can update any
      const ship = sceneShips.find((s: SceneShip) => s.id === shipId);
      if (!ship) return;
      if (!isDm && !ship.isCrewShip) return;
      updateMutation.mutate({ shipId, updates });
    },
    [updateMutation, isDm, sceneShips]
  );

  const updateDisposition = useCallback(
    (shipId: string, disposition: ShipDisposition) => {
      if (!isDm) return;
      updateMutation.mutate({ shipId, updates: { disposition } });
    },
    [updateMutation, isDm]
  );

  const toggleVisibility = useCallback(
    (shipId: string) => {
      if (!isDm) return;
      const ship = sceneShips.find((s: SceneShip) => s.id === shipId);
      if (ship) {
        updateMutation.mutate({
          shipId,
          updates: { visibleToPlayers: ship.visibleToPlayers === false ? true : false },
        });
      }
    },
    [updateMutation, isDm, sceneShips]
  );

  return (
    <SceneShipsContext.Provider
      value={{
        sceneShips,
        isLoading,
        addToScene,
        removeFromScene,
        isInScene,
        clearScene,
        updateShip,
        updateDisposition,
        toggleVisibility,
      }}
    >
      {children}
    </SceneShipsContext.Provider>
  );
}

export function useSceneShips() {
  const context = useContext(SceneShipsContext);
  if (!context) {
    throw new Error('useSceneShips must be used within a SceneShipsProvider');
  }
  return context;
}
