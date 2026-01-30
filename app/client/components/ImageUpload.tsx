import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';

interface ImageUploadProps {
  currentImage?: string;
  entityId: string;
  uploadEndpoint: 'lore-images' | 'location-images' | 'pc-portraits';
  onUploadComplete: (path: string) => void;
  onRemove?: () => void;
  autoSave?: (newPath: string) => Promise<void>; // Optional: trigger a save after upload with the new path
  playerMode?: boolean; // Use player API endpoint for uploads
}

export function ImageUpload({
  currentImage,
  entityId,
  uploadEndpoint,
  onUploadComplete,
  onRemove,
  autoSave,
  playerMode = false,
}: ImageUploadProps) {
  const { campaign } = useCampaign();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the image URL
  const getImageUrl = () => {
    if (previewUrl) return previewUrl;
    if (currentImage && campaign) {
      return `/api/campaigns/${campaign.id}/assets/${currentImage.replace('assets/', '')}`;
    }
    return null;
  };

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
  };

  const handleUpload = async () => {
    if (!selectedFile || !campaign) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Use player API endpoint if in player mode
      const apiBase = playerMode ? '/api/player' : '/api';
      const response = await fetch(
        `${apiBase}/campaigns/${campaign.id}/${uploadEndpoint}/${entityId}`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      const newPath = data.data.path;
      onUploadComplete(newPath);
      setSelectedFile(null);

      // Auto-save if callback provided, passing the new path
      if (autoSave) {
        await autoSave(newPath);
      }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    handleClear();
    onRemove?.();
  };

  const imageUrl = getImageUrl();

  return (
    <div className="space-y-4">
      {/* Preview area */}
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={imageUrl}
            alt="Preview"
            className="h-48 w-full object-cover"
          />
          {(currentImage || selectedFile) && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30">
          <div className="text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-1 text-sm text-muted-foreground">No image uploaded</p>
          </div>
        </div>
      )}

      {/* File input */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Upload className="h-4 w-4" />
          {currentImage || selectedFile ? 'Change Image' : 'Upload Image'}
        </label>
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
            {isUploading ? 'Uploading...' : 'Save Image'}
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
