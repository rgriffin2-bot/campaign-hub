import { useState, useCallback, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { BoardCanvas, BoardCanvasRef } from './components/BoardCanvas';
import { BoardToolbar } from './components/BoardToolbar';
import { TokenPalette } from './components/TokenPalette';
import type { TacticalBoard, BoardToken, TokenSourceType } from '@shared/schemas/tactical-board';

export function TacticalBoardDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { get, update } = useFiles('tactical-board');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const canvasRef = useRef<BoardCanvasRef>(null);

  // Fetch board data
  const { data: parsedFile, isLoading, isError } = get(fileId || '');

  // Extract board from frontmatter
  const board = parsedFile?.frontmatter as TacticalBoard | undefined;
  const tokens = (board?.tokens || []) as BoardToken[];

  // Handle board update
  const handleUpdateBoard = useCallback(
    async (updates: Partial<TacticalBoard>) => {
      if (!board || !fileId) return;
      await update.mutateAsync({
        fileId,
        input: { frontmatter: { ...board, ...updates } },
      });
    },
    [board, fileId, update]
  );

  // Handle token update
  const handleUpdateToken = useCallback(
    async (tokenId: string, updates: Partial<BoardToken>) => {
      if (!board || !fileId) return;

      const updatedTokens = tokens.map((t) =>
        t.id === tokenId ? { ...t, ...updates } : t
      );

      await update.mutateAsync({
        fileId,
        input: { frontmatter: { ...board, tokens: updatedTokens } },
      });
    },
    [board, fileId, tokens, update]
  );

  // Handle adding a token
  const handleAddToken = useCallback(
    async (
      sourceType: TokenSourceType,
      sourceId: string,
      label: string,
      image?: string,
      x = 400,
      y = 400
    ) => {
      if (!board || !fileId) return;

      const newToken: BoardToken = {
        id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceType,
        sourceId,
        label,
        image,
        x,
        y,
        size: 80,
        rotation: 0,
        zIndex: tokens.length,
        shape: 'circle',
        showLabel: true,
        labelPosition: 'below',
        visibleToPlayers: true,
        locked: false,
      };

      await update.mutateAsync({
        fileId,
        input: { frontmatter: { ...board, tokens: [...tokens, newToken] } },
      });

      setSelectedTokenId(newToken.id);
    },
    [board, fileId, tokens, update]
  );

  // Handle adding token from palette (at current viewport center)
  const handleAddTokenFromPalette = useCallback(
    (sourceType: TokenSourceType, sourceId: string, label: string, image?: string) => {
      // Get current viewport center from canvas
      const viewportCenter = canvasRef.current?.getViewportCenter();
      const x = viewportCenter?.x ?? (board?.canvasWidth || 2000) / 2;
      const y = viewportCenter?.y ?? (board?.canvasHeight || 2000) / 2;
      handleAddToken(sourceType, sourceId, label, image, x, y);
    },
    [board, handleAddToken]
  );

  // Handle adding token from double-click
  const handleAddTokenAtPosition = useCallback(
    (x: number, y: number) => {
      handleAddToken('custom', '', 'Token', undefined, x, y);
    },
    [handleAddToken]
  );

  // Handle adding text box from floating toolbar
  const handleAddTextBox = useCallback(
    (x: number, y: number) => {
      handleAddToken('text', '', 'Text', undefined, x, y);
    },
    [handleAddToken]
  );

  // Handle deleting a token
  const handleDeleteToken = useCallback(async () => {
    if (!board || !fileId || !selectedTokenId) return;

    const filteredTokens = tokens.filter((t) => t.id !== selectedTokenId);
    await update.mutateAsync({
      fileId,
      input: { frontmatter: { ...board, tokens: filteredTokens } },
    });

    setSelectedTokenId(null);
  }, [board, fileId, selectedTokenId, tokens, update]);

  // Toggle grid
  const handleToggleGrid = useCallback(() => {
    handleUpdateBoard({ gridEnabled: !board?.gridEnabled });
  }, [board, handleUpdateBoard]);

  // Toggle snap to grid
  const handleToggleSnapToGrid = useCallback(() => {
    handleUpdateBoard({ snapToGrid: !board?.snapToGrid });
  }, [board, handleUpdateBoard]);

  // Toggle token visibility
  const handleToggleTokenVisibility = useCallback(() => {
    if (!selectedTokenId) return;
    const token = tokens.find((t) => t.id === selectedTokenId);
    if (token) {
      handleUpdateToken(selectedTokenId, { visibleToPlayers: !token.visibleToPlayers });
    }
  }, [tokens, selectedTokenId, handleUpdateToken]);

  // Toggle token lock
  const handleToggleTokenLock = useCallback(() => {
    if (!selectedTokenId) return;
    const token = tokens.find((t) => t.id === selectedTokenId);
    if (token) {
      handleUpdateToken(selectedTokenId, { locked: !token.locked });
    }
  }, [tokens, selectedTokenId, handleUpdateToken]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Error or not found
  if (isError || !board) {
    return <Navigate to="/modules/tactical-board" replace />;
  }

  // Build the full board object with tokens for components
  const fullBoard: TacticalBoard = {
    ...board,
    tokens,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <BoardToolbar
        board={fullBoard}
        isEditable={true}
        onToggleGrid={handleToggleGrid}
        onToggleSnapToGrid={handleToggleSnapToGrid}
      />

      {/* Main content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1">
          <BoardCanvas
            ref={canvasRef}
            board={fullBoard}
            isEditable={true}
            selectedTokenId={selectedTokenId}
            onSelectToken={setSelectedTokenId}
            onUpdateToken={handleUpdateToken}
            onAddToken={handleAddTokenAtPosition}
            onAddTextBox={handleAddTextBox}
            onToggleTokenLock={handleToggleTokenLock}
            onToggleTokenVisibility={handleToggleTokenVisibility}
            onDeleteToken={handleDeleteToken}
          />
        </div>

        {/* Token Palette Sidebar */}
        {showPalette && (
          <div className="w-64 shrink-0 border-l border-border bg-card">
            <TokenPalette onAddToken={handleAddTokenFromPalette} />
          </div>
        )}

        {/* Palette toggle button */}
        <button
          type="button"
          onClick={() => setShowPalette(!showPalette)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-md border border-r-0 border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          style={{ right: showPalette ? '16rem' : 0 }}
          title={showPalette ? 'Hide palette' : 'Show palette'}
        >
          {showPalette ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
