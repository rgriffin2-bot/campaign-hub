/**
 * InitiativeProvider -- Context provider for the combat initiative tracker.
 *
 * State is server-authoritative: every mutation PATCHes/POSTs to the API and
 * the response immediately replaces the local cache. Between mutations the
 * state is polled every 3 seconds so players stay in sync with the DM.
 *
 * All write operations are gated on `isDm` -- player clients silently no-op.
 */
import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCampaign } from './CampaignProvider';
import { useMode } from './ModeProvider';
import type {
  InitiativeEntry,
  InitiativeState,
  InitiativeSourceType,
} from '@shared/types/initiative';

// Re-export types for consumers
export type { InitiativeEntry, InitiativeState, InitiativeSourceType };

// Polling interval for live updates (1 second)
const POLL_INTERVAL = 1000;

/** Shape of the context exposed to consumers via useInitiative(). */
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
  reorderList: (orderedIds: string[]) => void;

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
  const { isDMMode: isDm } = useMode();
  const queryClient = useQueryClient();

  // DM and player endpoints differ: the player one filters hidden entries
  const endpoint = isDm
    ? '/api/modules/live-play/initiative'
    : '/api/player/initiative';

  // Temporarily pause polling during reorder mutations to prevent stale data overwrites
  const reorderInFlight = useRef(false);

  // Fetch initiative state with polling
  const { data: initiative = DEFAULT_STATE, isLoading } = useQuery({
    queryKey: ['initiative', campaign?.id, isDm],
    queryFn: async () => {
      if (!campaign) return DEFAULT_STATE;
      // During a reorder mutation, skip the server fetch entirely.
      // Return current cached data so the optimistic update isn't overwritten
      // by an already-scheduled poll timer.
      if (reorderInFlight.current) {
        return queryClient.getQueryData<InitiativeState>(['initiative', campaign?.id, isDm]) || DEFAULT_STATE;
      }
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data || DEFAULT_STATE;
    },
    enabled: !!campaign,
    refetchInterval: () => reorderInFlight.current ? false : POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });

  // ── Mutations ───────────────────────────────────────────────────────
  // Each mutation writes to the server and immediately updates the React Query
  // cache with the server's response (optimistic-ish: we trust the server reply).

  // Add a single entry
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

  // Mutation for reordering by full ID list (drag-and-drop)
  // Uses optimistic updates so the UI reorders instantly without waiting for the server.
  const reorderListMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch('/api/modules/live-play/initiative/reorder-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onMutate: async (orderedIds) => {
      // Pause polling and cancel in-flight fetches to prevent stale data overwrites
      reorderInFlight.current = true;
      await queryClient.cancelQueries({ queryKey: ['initiative', campaign?.id, isDm] });

      const previousState = queryClient.getQueryData<InitiativeState>(['initiative', campaign?.id, isDm]);

      // Optimistically reorder entries in the cache
      if (previousState) {
        const entryMap = new Map(previousState.entries.map(e => [e.id, e]));
        const reordered = orderedIds
          .map(id => entryMap.get(id))
          .filter(Boolean) as InitiativeEntry[];
        for (const entry of previousState.entries) {
          if (!orderedIds.includes(entry.id)) reordered.push(entry);
        }
        queryClient.setQueryData(['initiative', campaign?.id, isDm], {
          ...previousState,
          entries: reordered,
        });
      }

      return { previousState };
    },
    onError: (_err, _orderedIds, context) => {
      // Revert on error and resume polling
      if (context?.previousState) {
        queryClient.setQueryData(['initiative', campaign?.id, isDm], context.previousState);
      }
      reorderInFlight.current = false;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(['initiative', campaign?.id, isDm], newState);
    },
    onSettled: () => {
      // Resume polling after mutation completes (success or error)
      reorderInFlight.current = false;
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

  // ── Callback wrappers ───────────────────────────────────────────────
  // Each callback guards with `if (!isDm) return` so player clients never fire writes.

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

  /** Jump to a specific entry, deactivating all others. */
  const setActiveEntry = useCallback(
    (entryId: string) => {
      if (!isDm) return;
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

  const reorderList = useCallback(
    (orderedIds: string[]) => {
      if (!isDm) return;
      reorderListMutation.mutate(orderedIds);
    },
    [reorderListMutation, isDm]
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
        reorderList,
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

/** Hook to consume initiative state. Must be inside an InitiativeProvider. */
export function useInitiative() {
  const context = useContext(InitiativeContext);
  if (!context) {
    throw new Error('useInitiative must be used within an InitiativeProvider');
  }
  return context;
}
