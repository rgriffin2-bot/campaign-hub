/**
 * PlayerLocationList -- Player-facing location browser.
 *
 * Three view modes:
 *  - Tree: hierarchical list with expand/collapse and search highlight
 *  - Cards: flat grid of location cards with images
 *  - Map: full-screen star-system map rendered with Three.js (shared FullMapView component)
 *
 * Locations are fetched via the player files hook and displayed read-only.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, List, LayoutGrid, Globe } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../hooks/useCampaign';
import { FullMapView } from '../modules/locations/components/FullMapView';
import type { FileMetadata } from '@shared/types/file';

type ViewMode = 'tree' | 'cards' | 'map';

interface TreeNode {
  location: FileMetadata;
  children: TreeNode[];
}

// ── Tree helpers ─────────────────────────────────────────────────────

/** Build a parent-child tree from the flat locations list, using `parent` and `treeRoot` fields. */
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

/** Recursively check if node or any descendant matches the search term. */
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

// ── TreeNodeComponent ────────────────────────────────────────────────
/** Renders one row in the tree view, with expand/collapse and optional thumbnail. */
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

// ── Map view uses the shared FullMapView component ───────────────────

// ── Main exported component ──────────────────────────────────────────

export function PlayerLocationList() {
  const { list } = usePlayerFiles('locations');
  const { campaign } = useCampaign();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Data preparation ───────────────────────────────────────────────
  const locations = list.data || [];
  const tree = buildTree(locations);

  // Filter tree nodes by search term (keeps parents if any descendant matches)
  const searchLower = search.toLowerCase();
  const filteredTree = searchLower
    ? tree.filter((node) => nodeMatchesSearch(node, searchLower))
    : tree;

  // Flat-filtered list used by the cards view
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

  // Auto-expand ancestor nodes when a search term matches a descendant,
  // so the matching node is always visible without manual expansion.
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
        <FullMapView locations={locations} onClose={() => setViewMode('tree')} basePath="/player/modules/locations" />
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
