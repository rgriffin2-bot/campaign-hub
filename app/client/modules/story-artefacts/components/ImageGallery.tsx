import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Trash2 } from 'lucide-react';
import type { ArtefactImage } from '@shared/schemas/story-artefact';

interface ImageGalleryProps {
  images: ArtefactImage[];
  campaignId: string;
  onSetPrimary?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  editable?: boolean;
}

export function ImageGallery({
  images,
  campaignId,
  onSetPrimary,
  onDelete,
  editable = false,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getImageUrl = (path: string) => {
    return `/api/campaigns/${campaignId}/assets/${path.replace('assets/', '')}`;
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, goToPrevious, goToNext]);

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {images.map((image, index) => (
          <div key={image.id} className="group relative">
            <button
              onClick={() => openLightbox(index)}
              className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-primary/50"
            >
              <img
                src={getImageUrl(image.thumbPath || image.path)}
                alt={image.caption || `Image ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {image.isPrimary && (
                <div className="absolute left-1 top-1 rounded-full bg-primary p-1">
                  <Star className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                </div>
              )}
            </button>

            {/* Edit controls */}
            {editable && (
              <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!image.isPrimary && onSetPrimary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPrimary(image.id);
                    }}
                    className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
                    title="Set as primary image"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this image?')) {
                        onDelete(image.id);
                      }
                    }}
                    className="rounded bg-destructive/50 p-1 text-white hover:bg-destructive/70"
                    title="Delete image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Main image */}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(currentImage.path)}
              alt={currentImage.caption || `Image ${currentIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />

            {/* Caption and counter */}
            <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/50 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">
                  {currentIndex + 1} / {images.length}
                </span>
                {currentImage.caption && (
                  <span className="text-sm">{currentImage.caption}</span>
                )}
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`h-12 w-12 overflow-hidden rounded border-2 transition-colors ${
                    index === currentIndex
                      ? 'border-white'
                      : 'border-transparent opacity-50 hover:opacity-75'
                  }`}
                >
                  <img
                    src={getImageUrl(image.thumbPath || image.path)}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
