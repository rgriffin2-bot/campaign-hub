import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, MapPin, Eye, EyeOff } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { useFiles } from '../../../hooks/useFiles';
import type { FileMetadata } from '@shared/types/file';

interface LocationTreeProps {
  locations: FileMetadata[];
  searchTerm?: string;
}

interface TreeNode {
  location: FileMetadata;
  children: TreeNode[];
}

// Build tree structure from flat list
function buildTree(locations: FileMetadata[]): TreeNode[] {
  const locationMap = new Map<string, FileMetadata>();
  const childrenMap = new Map<string, FileMetadata[]>();

  // Index all locations
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
  }

  // Group by parent (treating treeRoot items as having no parent for tree purposes)
  for (const loc of locations) {
    const isTreeRoot = loc.treeRoot === true;
    const parentId = isTreeRoot ? undefined : (loc.parent as string | undefined);
    const key = parentId || '__root__';
    const children = childrenMap.get(key) || [];
    children.push(loc);
    childrenMap.set(key, children);
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

  // Get root nodes (no parent or treeRoot=true)
  const roots = childrenMap.get('__root__') || [];
  return roots.map(buildNode).sort((a, b) =>
    a.location.name.localeCompare(b.location.name)
  );
}

// Check if a node or any of its descendants match the search
function nodeMatchesSearch(node: TreeNode, searchLower: string): boolean {
  const loc = node.location;
  if (
    loc.name.toLowerCase().includes(searchLower) ||
    (loc.type as string | undefined)?.toLowerCase().includes(searchLower) ||
    (loc.description as string | undefined)?.toLowerCase().includes(searchLower) ||
    (loc.tags as string[] | undefined)?.some((tag) =>
      tag.toLowerCase().includes(searchLower)
    )
  ) {
    return true;
  }
  return node.children.some((child) => nodeMatchesSearch(child, searchLower));
}

interface TreeNodeComponentProps {
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
}: TreeNodeComponentProps) {
  const { campaign } = useCampaign();
  const { toggleVisibility } = useFiles('locations');
  const { location, children } = node;

  const isExpanded = expandedIds.has(location.id);
  const hasChildren = children.length > 0;
  const isHidden = location.hidden === true;

  // Get image if available
  const image = location.image as string | undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: location.id, hidden: !isHidden });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleExpanded(location.id);
  };

  // Highlight matching text if searching
  const searchLower = searchTerm?.toLowerCase() || '';
  const isMatch =
    searchLower &&
    (location.name.toLowerCase().includes(searchLower) ||
      (location.type as string | undefined)?.toLowerCase().includes(searchLower));

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent ${
          isMatch ? 'bg-primary/10' : ''
        } ${isHidden ? 'opacity-60' : ''}`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleToggleExpand}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-accent ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Location icon/image */}
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-primary/10">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <MapPin className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Location name and type */}
        <Link
          to={`/modules/locations/${location.id}`}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <span
              className={`truncate font-medium transition-colors group-hover:text-primary ${
                isHidden ? 'text-muted-foreground' : 'text-foreground'
              }`}
            >
              {location.name}
            </span>
            {location.type ? (
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                {String(location.type)}
              </span>
            ) : null}
            {isHidden && (
              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-500">
                Hidden
              </span>
            )}
          </div>
        </Link>

        {/* Visibility toggle */}
        <button
          onClick={handleToggleVisibility}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded opacity-0 transition-all group-hover:opacity-100 ${
            isHidden
              ? 'text-amber-500 hover:bg-amber-500/20'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={isHidden ? 'Show to players' : 'Hide from players'}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

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

export function LocationTree({ locations, searchTerm }: LocationTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = buildTree(locations);

  // Filter tree based on search
  const searchLower = searchTerm?.toLowerCase() || '';
  const filteredTree = searchLower
    ? tree.filter((node) => nodeMatchesSearch(node, searchLower))
    : tree;

  // Auto-expand nodes with matching descendants when searching
  const expandedWithSearch = searchLower
    ? new Set([
        ...expandedIds,
        ...locations
          .filter((loc) => {
            // Expand if any descendant matches
            const descendants = locations.filter((l) => {
              let current = l.parent as string | undefined;
              while (current) {
                if (current === loc.id) return true;
                current = locations.find((x) => x.id === current)?.parent as
                  | string
                  | undefined;
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

  if (filteredTree.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {searchTerm ? 'No locations match your search' : 'No locations yet'}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filteredTree.map((node) => (
        <TreeNodeComponent
          key={node.location.id}
          node={node}
          level={0}
          searchTerm={searchTerm}
          expandedIds={expandedWithSearch}
          toggleExpanded={toggleExpanded}
        />
      ))}
    </div>
  );
}
