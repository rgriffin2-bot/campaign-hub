import { useState, useRef } from 'react';
import { Upload, X, Rocket } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';

interface ShipImageUploadProps {
  currentImage?: string;
  shipId: string;
  onUploadComplete: (path: string) => void;
}

export function ShipImageUpload({
  currentImage,
  shipId,
  onUploadComplete,
}: ShipImageUploadProps) {
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

      const response = await fetch(
        `/api/campaigns/${campaign.id}/ship-images/${shipId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadComplete(data.data.path);
      setSelectedFile(null);
      // Keep showing the preview until the page refreshes
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

  const imageUrl = getImageUrl();

  return (
    <div className="space-y-4">
      {/* Preview area */}
      <div className="flex items-start gap-4">
        <div className="relative aspect-video w-48 shrink-0 overflow-hidden rounded-lg border-2 border-border bg-secondary">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Ship preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Rocket className="h-12 w-12" />
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
              id="ship-image-upload"
            />
            <label
              htmlFor="ship-image-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {currentImage || selectedFile ? 'Change Image' : 'Upload Image'}
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Recommended: 16:9 aspect ratio (e.g., 800x450). Images will be cropped to fit.
          </p>
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
