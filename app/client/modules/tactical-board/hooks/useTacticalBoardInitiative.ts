/**
 * useTacticalBoardInitiative -- Local-only initiative tracker for the tactical board.
 *
 * Unlike the live-play InitiativeProvider (which is server-authoritative and polled),
 * this hook keeps all state client-side. It is used when the DM wants a quick
 * initiative order on the tactical board without persisting to the server.
 *
 * Provides `addFromTokens()` to bulk-import board tokens into the initiative list,
 * de-duplicating by sourceId or name+type.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { InitiativeEntry, InitiativeState } from '@shared/types/initiative';
import type { BoardToken } from '@shared/schemas/tactical-board';

/** Generate a unique ID combining timestamp and random suffix. */
function generateId(): string {
  return `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface TacticalBoardInitiativeState {
  initiative: InitiativeState;
  addEntry: (entry: Omit<InitiativeEntry, 'id'>) => void;
  removeEntry: (entryId: string) => void;
  updateEntry: (entryId: string, updates: Partial<InitiativeEntry>) => void;
  clearAllEntries: () => void;
  nextTurn: () => void;
  prevTurn: () => void;
  moveEntryUp: (entryId: string) => void;
  moveEntryDown: (entryId: string) => void;
  addFromTokens: () => void; // No longer requires tokens parameter
}

export function useTacticalBoardInitiative(tokens: BoardToken[]): TacticalBoardInitiativeState {
  // Keep a ref to the latest tokens so the stable `addFromTokens` callback
  // always reads the current board state without needing tokens in its deps.
  const tokensRef = useRef<BoardToken[]>(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // ── Local state ────────────────────────────────────────────────────
  const [initiative, setInitiative] = useState<InitiativeState>({
    entries: [],
    currentRound: 1,
    isActive: false,
    visibleToPlayers: true,
  });

  // ── Entry management ────────────────────────────────────────────────

  /** Add a single entry; auto-activates if it's the first in the list. */
  const addEntry = useCallback((entry: Omit<InitiativeEntry, 'id'>) => {
    const newEntry: InitiativeEntry = {
      ...entry,
      id: generateId(),
    };

    setInitiative((prev) => {
      // If first entry, make it active
      const entries = prev.entries.length === 0
        ? [{ ...newEntry, isActive: true }]
        : [...prev.entries, newEntry];

      return { ...prev, entries };
    });
  }, []);

  /** Remove an entry; if it was active, the first remaining entry becomes active. */
  const removeEntry = useCallback((entryId: string) => {
    setInitiative((prev) => {
      const wasActive = prev.entries.find((e) => e.id === entryId)?.isActive;
      const entries = prev.entries.filter((e) => e.id !== entryId);

      // Reassign active flag so there's always one active entry
      if (wasActive && entries.length > 0) {
        entries[0].isActive = true;
      }

      return { ...prev, entries };
    });
  }, []);

  // Update entry
  const updateEntry = useCallback((entryId: string, updates: Partial<InitiativeEntry>) => {
    setInitiative((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === entryId ? { ...e, ...updates } : e
      ),
    }));
  }, []);

  // Clear all entries
  const clearAllEntries = useCallback(() => {
    setInitiative((prev) => ({
      ...prev,
      entries: [],
      currentRound: 1,
    }));
  }, []);

  // ── Turn management ─────────────────────────────────────────────────

  /** Advance to the next entry; wraps around and increments the round counter. */
  const nextTurn = useCallback(() => {
    setInitiative((prev) => {
      if (prev.entries.length === 0) return prev;

      const activeIndex = prev.entries.findIndex((e) => e.isActive);
      const currentIndex = activeIndex === -1 ? 0 : activeIndex;

      // Calculate next index
      let nextIndex = currentIndex + 1;
      let newRound = prev.currentRound;

      if (nextIndex >= prev.entries.length) {
        nextIndex = 0;
        newRound += 1; // Increment round when wrapping
      }

      const entries = prev.entries.map((e, i) => ({
        ...e,
        isActive: i === nextIndex,
      }));

      return { ...prev, entries, currentRound: newRound };
    });
  }, []);

  /** Go back to the previous entry; decrements round when wrapping to the end. */
  const prevTurn = useCallback(() => {
    setInitiative((prev) => {
      if (prev.entries.length === 0) return prev;

      const activeIndex = prev.entries.findIndex((e) => e.isActive);
      const currentIndex = activeIndex === -1 ? 0 : activeIndex;

      // Calculate previous index
      let prevIndex = currentIndex - 1;
      let newRound = prev.currentRound;

      if (prevIndex < 0) {
        prevIndex = prev.entries.length - 1;
        newRound = Math.max(1, newRound - 1); // Decrement round when wrapping back
      }

      const entries = prev.entries.map((e, i) => ({
        ...e,
        isActive: i === prevIndex,
      }));

      return { ...prev, entries, currentRound: newRound };
    });
  }, []);

  // ── Reordering ──────────────────────────────────────────────────────

  /** Swap an entry one position up in the order. */
  const moveEntryUp = useCallback((entryId: string) => {
    setInitiative((prev) => {
      const index = prev.entries.findIndex((e) => e.id === entryId);
      if (index <= 0) return prev;

      const entries = [...prev.entries];
      [entries[index], entries[index - 1]] = [entries[index - 1], entries[index]];

      return { ...prev, entries };
    });
  }, []);

  /** Swap an entry one position down in the order. */
  const moveEntryDown = useCallback((entryId: string) => {
    setInitiative((prev) => {
      const index = prev.entries.findIndex((e) => e.id === entryId);
      if (index === -1 || index >= prev.entries.length - 1) return prev;

      const entries = [...prev.entries];
      [entries[index], entries[index + 1]] = [entries[index + 1], entries[index]];

      return { ...prev, entries };
    });
  }, []);

  // ── Bulk import from board ──────────────────────────────────────────

  /**
   * Import all eligible board tokens (PCs, NPCs, ships) into initiative,
   * skipping any that are already present (matched by sourceId or name+type).
   */
  const addFromTokens = useCallback(() => {
    const boardTokens = tokensRef.current;

    const eligibleTokens = boardTokens.filter(
      (token) =>
        token.sourceType === 'pc' ||
        token.sourceType === 'npc' ||
        token.sourceType === 'ship'
    );

    setInitiative((prev) => {
      // Check which tokens are already in initiative (by sourceId or name+type)
      // Build lookup sets to detect duplicates efficiently
      const existingSourceIds = new Set(
        prev.entries.filter((e) => e.sourceId).map((e) => e.sourceId)
      );
      const existingNameTypes = new Set(
        prev.entries.map((e) => `${e.sourceType}:${e.name}`)
      );

      const newEntries: InitiativeEntry[] = [];

      for (const token of eligibleTokens) {
        // Skip if already in initiative (check by sourceId if available)
        if (token.sourceId && existingSourceIds.has(token.sourceId)) {
          continue;
        }

        // Check by name+type as fallback
        const nameTypeKey = `${token.sourceType}:${token.label}`;
        if (existingNameTypes.has(nameTypeKey)) {
          continue;
        }

        newEntries.push({
          id: generateId(),
          sourceType: token.sourceType as 'pc' | 'npc' | 'ship' | 'custom',
          sourceId: token.sourceId || undefined,
          name: token.label,
          portrait: token.image,
          portraitPosition: token.imagePosition,
          initiative: 0,
          isActive: false,
        });

        // Track to prevent duplicates within the batch
        if (token.sourceId) {
          existingSourceIds.add(token.sourceId);
        }
        existingNameTypes.add(nameTypeKey);
      }

      if (newEntries.length === 0) return prev;

      const entries = [...prev.entries, ...newEntries];

      // If first entries being added, make the first one active
      if (prev.entries.length === 0 && entries.length > 0) {
        entries[0].isActive = true;
      }

      return { ...prev, entries };
    });
  }, []);

  return {
    initiative,
    addEntry,
    removeEntry,
    updateEntry,
    clearAllEntries,
    nextTurn,
    prevTurn,
    moveEntryUp,
    moveEntryDown,
    addFromTokens,
  };
}
