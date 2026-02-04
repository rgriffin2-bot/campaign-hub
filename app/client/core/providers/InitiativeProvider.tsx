import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useCampaign } from './CampaignProvider';
import { useAuth } from './AuthProvider';
import type {
  InitiativeEntry,
  InitiativeState,
  InitiativeSourceType,
} from '@shared/types/initiative';

// Re-export types for consumers
export type { InitiativeEntry, InitiativeState, InitiativeSourceType };

// Polling interval for live updates (3 seconds)
const POLL_INTERVAL = 3000;

interface InitiativeContextValue {
  // State
  initiative: InitiativeState;
  isLoading: boolean;
  isDm: boolean;

  // Entry management
  addEntry: (entry: Omit<InitiativeEntry, 'id'>) => void;
  addEntriesBatch: (entries: Array<Omit<InitiativeEntry, 'id'>>) => void;
  removeEntry: (entryId: string) => void;
  updateEntry: (entryId: string, updates: Partial<InitiativeEntry>) => void;
  clearAllEntries: () => void;

  // Turn management
  nextTurn: () => void;
  prevTurn: () => void;
  setActiveEntry: (entryId: string) => void;

  // Reordering
  moveEntryUp: (entryId: string) => void;
  moveEntryDown: (entryId: string) => void;

  // Visibility & state
  toggleVisibility: () => void;
  toggleActive: () => void;
  setRound: (round: number) => void;

  // Helpers
  getActiveEntry: () => InitiativeEntry | undefined;
}

const InitiativeContext = createContext<InitiativeContextValue | null>(null);

const DEFAULT_STATE: InitiativeState = {
  entries: [],
  currentRound: 1,
  isActive: false,
  visibleToPlayers: true,
};

export function InitiativeProvider({ children }: { children: ReactNode }) {
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
    ? '/api/modules/live-play/initiative'
    : '/api/player/initiative';

  // Fetch initiative state with polling
  const { data: initiative = DEFAULT_STATE, isLoading } = useQuery({
    queryKey: ['initiative', campaign?.id, isDm],
    queryFn: async () => {
      if (!campaign) return DEFAULT_STATE;
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data || DEFAULT_STATE;
    },
    enabled: !!campaign,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });

  // Mutation for adding an entry (DM only)
  const addMutation = useMutation({
    mutationFn: async (entry: Omit<InitiativeEntry, 'id'>) => {
      const res = await fetch('/api/modules/live-play/initiative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for adding multiple entries at once (DM only) - prevents duplicates server-side
  const addBatchMutation = useMutation({
    mutationFn: async (entries: Array<Omit<InitiativeEntry, 'id'>>) => {
      const res = await fetch('/api/modules/live-play/initiative/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for removing an entry (DM only)
  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/modules/live-play/initiative/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for updating an entry (DM only)
  const updateMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: Partial<InitiativeEntry> }) => {
      const res = await fetch(`/api/modules/live-play/initiative/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for clearing all entries (DM only)
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/modules/live-play/initiative', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for turn advancement
  const turnMutation = useMutation({
    mutationFn: async (direction: 'next' | 'prev') => {
      const res = await fetch(`/api/modules/live-play/initiative/${direction}-turn`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for reordering
  const reorderMutation = useMutation({
    mutationFn: async ({ entryId, direction }: { entryId: string; direction: 'up' | 'down' }) => {
      const res = await fetch('/api/modules/live-play/initiative/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, direction }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Mutation for updating state-level properties
  const stateMutation = useMutation({
    mutationFn: async (updates: Partial<InitiativeState>) => {
      const res = await fetch('/api/modules/live-play/initiative/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
  });

  // Callbacks
  const addEntry = useCallback(
    (entry: Omit<InitiativeEntry, 'id'>) => {
      if (!isDm) return;
      addMutation.mutate(entry);
    },
    [addMutation, isDm]
  );

  const addEntriesBatch = useCallback(
    (entries: Array<Omit<InitiativeEntry, 'id'>>) => {
      if (!isDm || entries.length === 0) return;
      addBatchMutation.mutate(entries);
    },
    [addBatchMutation, isDm]
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      if (!isDm) return;
      removeMutation.mutate(entryId);
    },
    [removeMutation, isDm]
  );

  const updateEntry = useCallback(
    (entryId: string, updates: Partial<InitiativeEntry>) => {
      if (!isDm) return;
      updateMutation.mutate({ entryId, updates });
    },
    [updateMutation, isDm]
  );

  const clearAllEntries = useCallback(() => {
    if (!isDm) return;
    clearMutation.mutate();
  }, [clearMutation, isDm]);

  const nextTurn = useCallback(() => {
    if (!isDm) return;
    turnMutation.mutate('next');
  }, [turnMutation, isDm]);

  const prevTurn = useCallback(() => {
    if (!isDm) return;
    turnMutation.mutate('prev');
  }, [turnMutation, isDm]);

  const setActiveEntry = useCallback(
    (entryId: string) => {
      if (!isDm) return;
      // Deactivate all, then activate the selected one
      const entries = initiative.entries.map((e: InitiativeEntry) => ({
        ...e,
        isActive: e.id === entryId,
      }));
      stateMutation.mutate({ entries });
    },
    [stateMutation, isDm, initiative.entries]
  );

  const moveEntryUp = useCallback(
    (entryId: string) => {
      if (!isDm) return;
      reorderMutation.mutate({ entryId, direction: 'up' });
    },
    [reorderMutation, isDm]
  );

  const moveEntryDown = useCallback(
    (entryId: string) => {
      if (!isDm) return;
      reorderMutation.mutate({ entryId, direction: 'down' });
    },
    [reorderMutation, isDm]
  );

  const toggleVisibility = useCallback(() => {
    if (!isDm) return;
    stateMutation.mutate({ visibleToPlayers: !initiative.visibleToPlayers });
  }, [stateMutation, isDm, initiative.visibleToPlayers]);

  const toggleActive = useCallback(() => {
    if (!isDm) return;
    stateMutation.mutate({ isActive: !initiative.isActive });
  }, [stateMutation, isDm, initiative.isActive]);

  const setRound = useCallback(
    (round: number) => {
      if (!isDm) return;
      stateMutation.mutate({ currentRound: Math.max(1, round) });
    },
    [stateMutation, isDm]
  );

  const getActiveEntry = useCallback(() => {
    return initiative.entries.find((e: InitiativeEntry) => e.isActive);
  }, [initiative.entries]);

  return (
    <InitiativeContext.Provider
      value={{
        initiative,
        isLoading,
        isDm,
        addEntry,
        addEntriesBatch,
        removeEntry,
        updateEntry,
        clearAllEntries,
        nextTurn,
        prevTurn,
        setActiveEntry,
        moveEntryUp,
        moveEntryDown,
        toggleVisibility,
        toggleActive,
        setRound,
        getActiveEntry,
      }}
    >
      {children}
    </InitiativeContext.Provider>
  );
}

export function useInitiative() {
  const context = useContext(InitiativeContext);
  if (!context) {
    throw new Error('useInitiative must be used within an InitiativeProvider');
  }
  return context;
}
