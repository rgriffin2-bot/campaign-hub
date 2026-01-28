import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import type { FileMetadata } from '@shared/types/file';

interface LocationBreadcrumbProps {
  currentLocation: { id: string; name: string; parent?: string };
  allLocations: FileMetadata[];
}

export function LocationBreadcrumb({
  currentLocation,
  allLocations,
}: LocationBreadcrumbProps) {
  // Build the ancestor chain by walking up the parent references
  const ancestors: { id: string; name: string }[] = [];
  let currentParentId = currentLocation.parent;

  while (currentParentId) {
    const parent = allLocations.find((loc) => loc.id === currentParentId);
    if (!parent) break;

    ancestors.unshift({ id: parent.id, name: parent.name });
    currentParentId = parent.parent as string | undefined;

    // Safety: prevent infinite loops from corrupted data
    if (ancestors.length > 20) break;
  }

  if (ancestors.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-1">
          <Link
            to={`/modules/locations/${ancestor.id}`}
            className="text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            {ancestor.name}
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </span>
      ))}
      <span className="font-medium text-foreground">{currentLocation.name}</span>
    </nav>
  );
}
