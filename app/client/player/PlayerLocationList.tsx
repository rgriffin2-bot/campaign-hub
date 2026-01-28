import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, List, LayoutGrid, Globe, X, ExternalLink } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../hooks/useCampaign';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location'; // Keep for type checking in sidebar

type ViewMode = 'tree' | 'cards' | 'map';

interface TreeNode {
  location: FileMetadata;
  children: TreeNode[];
}

// Build tree structure from flat list
function buildTree(locations: FileMetadata[]): TreeNode[] {
  const childrenMap = new Map<string, FileMetadata[]>();

  // Group by parent (treating treeRoot items as having no parent for tree purposes)
  for (const loc of locations) {
    const isTreeRoot = loc.treeRoot === true;
    const parentId = isTreeRoot ? '__root__' : ((loc.parent as string | undefined) || '__root__');
    const children = childrenMap.get(parentId) || [];
    children.push(loc);
    childrenMap.set(parentId, children);
  }

  // Build tree recursively
  function buildNode(location: FileMetadata): TreeNode {
    const children = childrenMap.get(location.id) || [];
    return {
      location,
      children: children.map(buildNode).sort((a, b) =>
        a.location.name.localeCompare(b.location.name)
      ),
    };
  }

  const roots = childrenMap.get('__root__') || [];
  return roots.map(buildNode).sort((a, b) =>
    a.location.name.localeCompare(b.location.name)
  );
}

// Check if node or descendants match search
function nodeMatchesSearch(node: TreeNode, searchLower: string): boolean {
  const loc = node.location;
  if (
    loc.name.toLowerCase().includes(searchLower) ||
    (loc.type as string | undefined)?.toLowerCase().includes(searchLower) ||
    (loc.description as string | undefined)?.toLowerCase().includes(searchLower)
  ) {
    return true;
  }
  return node.children.some((child) => nodeMatchesSearch(child, searchLower));
}

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  searchTerm?: string;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}

function TreeNodeComponent({
  node,
  level,
  searchTerm,
  expandedIds,
  toggleExpanded,
}: TreeNodeProps) {
  const { campaign } = useCampaign();
  const { location, children } = node;

  const isExpanded = expandedIds.has(location.id);
  const hasChildren = children.length > 0;

  const image = location.image as string | undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  const searchLower = searchTerm?.toLowerCase() || '';
  const isMatch =
    searchLower &&
    (location.name.toLowerCase().includes(searchLower) ||
      (location.type as string | undefined)?.toLowerCase().includes(searchLower));

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleExpanded(location.id);
  };

  return (
    <div>
      <Link
        to={`/player/modules/locations/${location.id}`}
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent ${
          isMatch ? 'bg-primary/10' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand button */}
        <button
          onClick={handleToggle}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-accent ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Icon/image */}
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-primary/10">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <MapPin className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Name and type */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground group-hover:text-primary">
            {location.name}
          </span>
          {location.type ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              {String(location.type)}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNodeComponent
              key={child.location.id}
              node={child}
              level={level + 1}
              searchTerm={searchTerm}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const BODY_TYPE_LABELS: Record<string, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  station: 'Station',
  asteroid_ring: 'Asteroid Belt',
};

interface MapSidebarProps {
  location: FileMetadata | null;
  onClose: () => void;
}

function PlayerMapSidebar({ location, onClose }: MapSidebarProps) {
  const { campaign } = useCampaign();

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Click on a celestial body to view details
        </p>
      </div>
    );
  }

  const celestial = location.celestial as CelestialData | undefined;
  const image = location.image as string | undefined;
  const description: string | undefined = typeof location.description === 'string' ? location.description : undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  return (
    <div className="flex flex-col">
      {/* Header with close button */}
      <div className="flex items-start justify-between p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {location.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {celestial && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {BODY_TYPE_LABELS[celestial.bodyType] || celestial.bodyType}
              </span>
            )}
            {location.type ? (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {String(location.type)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image preview */}
      {imageUrl ? (
        <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-border">
          <img
            src={imageUrl}
            alt={location.name}
            className="h-24 w-full object-cover"
          />
        </div>
      ) : null}

      {/* Description */}
      {description ? (
        <p className="mb-3 px-3 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {/* View Details link */}
      <div className="border-t border-border p-3">
        <Link
          to={`/player/modules/locations/${location.id}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View Details
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// Full-screen map view for players using iframe
function PlayerFullMapView({ locations, onClose }: { locations: FileMetadata[]; onClose: () => void }) {
  const { campaign } = useCampaign();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<FileMetadata | null>(null);
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const celestialLocations = locations.filter(
    (loc) => loc.celestial !== undefined && loc.celestial !== null
  );

  // Handle messages from iframe (for "Go to Entry" button)
  const handleIframeMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'navigate-to-location' && event.data?.locationId) {
      // Close the map and navigate to the player location view
      onClose();
      navigate(`/player/modules/locations/${event.data.locationId}`);
    }
  }, [onClose, navigate]);

  // Listen for postMessage from iframe
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [handleIframeMessage]);

  // Fetch the generated player map
  useEffect(() => {
    if (campaign) {
      fetchPlayerMap();
    }
  }, [campaign]);

  const fetchPlayerMap = async () => {
    if (!campaign) return;

    try {
      const response = await fetch(`/api/player/campaigns/${campaign.id}/map`);
      if (response.ok) {
        const html = await response.text();
        setMapHtml(html);
      } else {
        const data = await response.json();
        setError(data.error || 'Map not available');
      }
    } catch {
      setError('Failed to load map');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* Header bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">System Map</span>
          <span className="text-sm text-muted-foreground">
            {celestialLocations.length} celestial bodies
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main content area - positioned below header */}
      <div className="absolute inset-x-0 bottom-0 top-12 overflow-hidden">
        {error && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {mapHtml ? (
          // Render the generated HTML map in an iframe
          <iframe
            srcDoc={mapHtml}
            className="h-full w-full border-0"
            title="Star System Map"
            sandbox="allow-scripts"
          />
        ) : (
          // Fallback: Show placeholder
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium text-foreground">Map Not Available</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The star system map hasn't been generated yet.
              </p>
            </div>
            {celestialLocations.length === 0 && (
              <p className="text-sm text-amber-500">
                No celestial bodies available to display.
              </p>
            )}
          </div>
        )}

        {/* Sidebar overlay */}
        {selectedLocation && (
          <div className="absolute right-4 top-4 w-64 rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur">
            <PlayerMapSidebar
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayerLocationList() {
  const { list } = usePlayerFiles('locations');
  const { campaign } = useCampaign();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const locations = list.data || [];
  const tree = buildTree(locations);

  const searchLower = search.toLowerCase();
  const filteredTree = searchLower
    ? tree.filter((node) => nodeMatchesSearch(node, searchLower))
    : tree;

  const filteredLocations = locations.filter((loc) => {
    if (!search) return true;
    return (
      loc.name.toLowerCase().includes(searchLower) ||
      (loc.type as string | undefined)?.toLowerCase().includes(searchLower) ||
      (loc.description as string | undefined)?.toLowerCase().includes(searchLower)
    );
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Auto-expand when searching
  const effectiveExpanded = searchLower
    ? new Set([
        ...expandedIds,
        ...locations
          .filter((loc) => {
            const descendants = locations.filter((l) => {
              let current = l.parent as string | undefined;
              while (current) {
                if (current === loc.id) return true;
                current = locations.find((x) => x.id === current)?.parent as string | undefined;
              }
              return false;
            });
            return descendants.some(
              (d) =>
                d.name.toLowerCase().includes(searchLower) ||
                (d.type as string | undefined)?.toLowerCase().includes(searchLower)
            );
          })
          .map((loc) => loc.id),
      ])
    : expandedIds;

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
        </div>
        <div className="flex rounded-md border border-border bg-secondary">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 rounded-l-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'tree'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
            Tree
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 rounded-r-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-4 w-4" />
            Map
          </button>
        </div>
      </div>

      {/* Search */}
      {viewMode !== 'map' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* Content */}
      {locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No locations yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The DM hasn't added any locations yet.
          </p>
        </div>
      ) : viewMode === 'map' ? (
        <PlayerFullMapView locations={locations} onClose={() => setViewMode('tree')} />
      ) : viewMode === 'tree' ? (
        <div className="rounded-lg border border-border bg-card p-4">
          {filteredTree.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No locations match your search
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTree.map((node) => (
                <TreeNodeComponent
                  key={node.location.id}
                  node={node}
                  level={0}
                  searchTerm={search}
                  expandedIds={effectiveExpanded}
                  toggleExpanded={toggleExpanded}
                />
              ))}
            </div>
          )}
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No matches found</h3>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((loc) => {
            const image = loc.image as string | undefined;
            const imageUrl =
              image && campaign
                ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
                : null;

            return (
              <Link
                key={loc.id}
                to={`/player/modules/locations/${loc.id}`}
                className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
              >
                {imageUrl && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-medium text-foreground group-hover:text-primary">
                    {loc.name}
                  </h3>
                  {loc.type ? (
                    <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {String(loc.type)}
                    </span>
                  ) : null}
                  {loc.description ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {String(loc.description)}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Count */}
      {locations.length > 0 && viewMode !== 'map' && (
        <p className="text-center text-sm text-muted-foreground">
          {locations.length} location{locations.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
