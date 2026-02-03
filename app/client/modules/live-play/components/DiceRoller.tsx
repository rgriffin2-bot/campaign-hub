import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dices, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { DiceRollState, DiceType, DiceRoll } from '@shared/types/scene';
import type { ApiResponse } from '@shared/types/api';

const POLL_INTERVAL = 3000;

const diceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd100'];

interface DiceRollerProps {
  isDM?: boolean;
}

export function DiceRoller({ isDM = false }: DiceRollerProps) {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();
  const [isRolling, setIsRolling] = useState(false);

  // Use the appropriate API endpoint based on role
  const apiBase = isDM ? '/api/modules/live-play' : '/api/player';

  // Fetch dice roll state
  const { data: rollState } = useQuery({
    queryKey: ['dice-rolls', campaign?.id],
    queryFn: async () => {
      if (!campaign) return null;
      const res = await fetch(`${apiBase}/dice-rolls`, {
        credentials: 'include',
      });
      const data: ApiResponse<DiceRollState | null> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    enabled: !!campaign,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });

  // Roll dice mutation
  const rollMutation = useMutation({
    mutationFn: async (diceType: DiceType) => {
      const res = await fetch(`${apiBase}/dice-rolls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diceType,
          rolledBy: isDM ? 'dm' : 'player',
          rollerName: isDM ? 'DM' : undefined,
        }),
        credentials: 'include',
      });
      const data: ApiResponse<DiceRollState> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onMutate: () => {
      setIsRolling(true);
    },
    onSettled: () => {
      setTimeout(() => setIsRolling(false), 300);
      queryClient.invalidateQueries({ queryKey: ['dice-rolls', campaign?.id] });
    },
  });

  // Toggle visibility mutation (DM only)
  const visibilityMutation = useMutation({
    mutationFn: async (visibleToPlayers: boolean) => {
      const res = await fetch(`${apiBase}/dice-rolls/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleToPlayers }),
        credentials: 'include',
      });
      const data: ApiResponse<DiceRollState> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dice-rolls', campaign?.id] });
    },
  });

  // Clear rolls mutation (DM only)
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/dice-rolls`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data: ApiResponse<DiceRollState> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dice-rolls', campaign?.id] });
    },
  });

  const handleRoll = (diceType: DiceType) => {
    rollMutation.mutate(diceType);
  };

  const handleToggleVisibility = () => {
    if (rollState) {
      visibilityMutation.mutate(!rollState.visibleToPlayers);
    }
  };

  const handleClear = () => {
    clearMutation.mutate();
  };

  // For players, don't show if hidden
  if (!isDM && rollState && !rollState.visibleToPlayers) {
    return null;
  }

  const rolls = rollState?.rolls || [];
  const isHidden = rollState && !rollState.visibleToPlayers;

  return (
    <div className={`rounded-lg border bg-card p-3 ${isHidden ? 'border-amber-500/50' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Dices className="h-4 w-4" />
          <span>Dice Roller</span>
        </div>

        {/* DM controls */}
        {isDM && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleVisibility}
              disabled={visibilityMutation.isPending}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                isHidden
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title={isHidden ? 'Show to players' : 'Hide from players'}
            >
              {isHidden ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Hidden
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Visible
                </>
              )}
            </button>
            {rolls.length > 0 && (
              <button
                onClick={handleClear}
                disabled={clearMutation.isPending}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Clear roll history"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dice buttons */}
      <div className="flex flex-wrap gap-1 mb-2">
        {diceTypes.map((dice) => (
          <button
            key={dice}
            onClick={() => handleRoll(dice)}
            disabled={rollMutation.isPending}
            className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {dice}
          </button>
        ))}
      </div>

      {/* Roll history */}
      <div className="space-y-1">
        {rolls.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-1">
            No rolls yet
          </div>
        ) : (
          rolls.map((roll: DiceRoll, index: number) => (
            <div
              key={roll.id}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                index === 0 && isRolling ? 'animate-pulse bg-primary/10' : 'bg-secondary/50'
              }`}
            >
              <span className="text-muted-foreground">
                {roll.rollerName || (roll.rolledBy === 'dm' ? 'DM' : 'Player')}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{roll.diceType}:</span>
                <span className={`font-bold ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
                  {roll.result}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
