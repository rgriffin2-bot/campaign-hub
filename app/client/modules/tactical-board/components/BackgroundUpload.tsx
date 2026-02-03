import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';

interface BackgroundUploadProps {
  currentBackground?: string;
  backgroundScale?: number;
  backgroundX?: number;
  backgroundY?: number;
  boardId: string;
  onUploadComplete: (
    path: string,
    scale: number,
    x: number,
    y: number
  ) => void;
}

interface Position {
  x: number;
  y: number;
  scale: number;
}

export function BackgroundUpload({
  currentBackground,
  backgroundScale = 1,
  backgroundX = 0,
  backgroundY = 0,
  boardId,
  onUploadComplete,
}: BackgroundUploadProps) {
  const { campaign } = useCampaign();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [position, setPosition] = useState<Position>({
    x: backgroundX,
    y: backgroundY,
    scale: backgroundScale,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the image URL
  const getImageUrl = useCallback(() => {
    if (previewUrl) return previewUrl;
    if (currentBackground && campaign) {
      return `/api/campaigns/${campaign.id}/assets/${currentBackground.replace('assets/', '')}`;
    }
    return null;
  }, [previewUrl, currentBackground, campaign]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Reset position for new image
    setPosition({ x: 0, y: 0, scale: 1 });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (!previewUrl && !currentBackground) return;

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      setPosition((prev) => ({
        ...prev,
        x: dragStartRef.current!.posX + dx,
        y: dragStartRef.current!.posY + dy,
      }));
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleZoom = (delta: number) => {
    setPosition((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta)),
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !campaign) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(
        `/api/campaigns/${campaign.id}/board-backgrounds/${boardId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadComplete(data.data.path, position.scale, position.x, position.y);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPosition({ x: 0, y: 0, scale: 1 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const imageUrl = getImageUrl();

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-foreground">Background Map</label>

      {/* Preview area - Landscape orientation for battle maps */}
      <div className="flex items-start gap-4">
        <div
          ref={previewRef}
          className="relative h-40 w-64 shrink-0 overflow-hidden rounded-lg border-2 border-border bg-secondary"
          style={{ cursor: imageUrl ? 'move' : 'default' }}
          onMouseDown={handleDragStart}
        >
          {imageUrl ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${100 * position.scale}%`,
                backgroundPosition: `${50 + position.x}% ${50 + position.y}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
              <Image className="h-10 w-10" />
              <span className="mt-2 text-xs">No background</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          {/* File input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="board-background-upload"
            />
            <label
              htmlFor="board-background-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {currentBackground || selectedFile ? 'Change Background' : 'Upload Background'}
            </label>
          </div>

          {/* Zoom controls */}
          {imageUrl && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={position.scale}
                  onChange={(e) =>
                    setPosition((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Instructions */}
          {imageUrl && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Move className="h-3 w-3" />
              Drag to reposition the background image.
            </p>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action buttons */}
      {selectedFile && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Save Background'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
