import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { BackgroundUpload } from './components/BackgroundUpload';
import type { TacticalBoard } from '@shared/schemas/tactical-board';

export function TacticalBoardEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update, delete: remove } = useFiles('tactical-board');
  const isNew = fileId === 'new';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(2000);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  const [gridColor, setGridColor] = useState('rgba(255, 255, 255, 0.2)');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [background, setBackground] = useState<string | undefined>();
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundX, setBackgroundX] = useState(0);
  const [backgroundY, setBackgroundY] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch existing board data
  const { data: parsedFile, isLoading } = get(isNew ? '' : (fileId || ''));

  // Populate form with existing data
  useEffect(() => {
    if (parsedFile) {
      const existingBoard = parsedFile.frontmatter as TacticalBoard;
      setName(existingBoard.name || '');
      setDescription(existingBoard.description || '');
      setCanvasWidth(existingBoard.canvasWidth || 2000);
      setCanvasHeight(existingBoard.canvasHeight || 2000);
      setGridEnabled(existingBoard.gridEnabled || false);
      setGridSize(existingBoard.gridSize || 50);
      setGridColor(existingBoard.gridColor || 'rgba(255, 255, 255, 0.2)');
      setSnapToGrid(existingBoard.snapToGrid || false);
      setHidden(existingBoard.hidden || false);
      setBackground(existingBoard.background);
      setBackgroundScale(existingBoard.backgroundScale || 1);
      setBackgroundX(existingBoard.backgroundX || 0);
      setBackgroundY(existingBoard.backgroundY || 0);
    }
  }, [parsedFile]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const existingBoard = parsedFile?.frontmatter as TacticalBoard | undefined;
      const boardData: Partial<TacticalBoard> = {
        name: name.trim(),
        description: description.trim() || undefined,
        canvasWidth,
        canvasHeight,
        gridEnabled,
        gridSize,
        gridColor,
        snapToGrid,
        hidden,
        background,
        backgroundScale,
        backgroundX,
        backgroundY,
        tokens: existingBoard?.tokens || [],
      };

      if (isNew) {
        const result = await create.mutateAsync({
          name: name.trim(),
          frontmatter: boardData,
          content: '',
        });
        navigate(`/modules/tactical-board/${result.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: { frontmatter: boardData },
        });
        navigate(`/modules/tactical-board/${fileId}`);
      }
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!fileId || isNew) return;

    if (!confirm('Are you sure you want to delete this board? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await remove.mutateAsync(fileId);
      navigate('/modules/tactical-board');
    } catch (error) {
      console.error('Error deleting board:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={isNew ? '/modules/tactical-board' : `/modules/tactical-board/${fileId}`}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'Create Tactical Board' : 'Edit Board Settings'}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Encounter: Asteroid Field"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this tactical board..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Canvas Size */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Canvas Size (pixels)
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="canvasWidth" className="text-xs text-muted-foreground">
                Width
              </label>
              <input
                id="canvasWidth"
                type="number"
                min={400}
                max={10000}
                value={canvasWidth}
                onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 2000)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="canvasHeight" className="text-xs text-muted-foreground">
                Height
              </label>
              <input
                id="canvasHeight"
                type="number"
                min={400}
                max={10000}
                value={canvasHeight}
                onChange={(e) => setCanvasHeight(parseInt(e.target.value) || 2000)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Grid Settings */}
        <div className="space-y-4 rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Grid Settings</h3>

          <div className="flex items-center gap-3">
            <input
              id="gridEnabled"
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <label htmlFor="gridEnabled" className="text-sm text-foreground">
              Show grid overlay
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="snapToGrid"
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <label htmlFor="snapToGrid" className="text-sm text-foreground">
              Snap tokens to grid
            </label>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="gridSize" className="text-xs text-muted-foreground">
                Grid Size (pixels)
              </label>
              <input
                id="gridSize"
                type="number"
                min={10}
                max={200}
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value) || 50)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="gridColor" className="text-xs text-muted-foreground">
                Grid Color
              </label>
              <input
                id="gridColor"
                type="text"
                value={gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                placeholder="rgba(255, 255, 255, 0.2)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Background Image - only show for existing boards */}
        {!isNew && fileId && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <BackgroundUpload
              currentBackground={background}
              backgroundScale={backgroundScale}
              backgroundX={backgroundX}
              backgroundY={backgroundY}
              boardId={fileId}
              onUploadComplete={(path, scale, x, y) => {
                setBackground(path);
                setBackgroundScale(scale);
                setBackgroundX(x);
                setBackgroundY(y);
              }}
            />
          </div>
        )}

        {isNew && (
          <div className="rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            Save the board first to upload a background image.
          </div>
        )}

        {/* Visibility */}
        <div className="flex items-center gap-3">
          <input
            id="hidden"
            type="checkbox"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <label htmlFor="hidden" className="text-sm text-foreground">
            Hide from players
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Board'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            to={isNew ? '/modules/tactical-board' : `/modules/tactical-board/${fileId}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : isNew ? 'Create Board' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
