import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Location } from '@/modules/locations/types';
import { flattenSystem, generateSeedSystem, getSystemParentMap, type SystemNode } from '../utils/systemGenerator';

interface MapModePanelProps {
  locations: Location[];
  onExit: () => void;
}

interface PositionedNode {
  node: SystemNode;
  x: number;
  y: number;
}

export function MapModePanel({ locations, onExit }: MapModePanelProps) {
  const system = useMemo(() => generateSeedSystem(), []);
  const nodes = useMemo(() => flattenSystem(system), [system]);
  const parentMap = useMemo(() => getSystemParentMap(system), [system]);
  const [selectedId, setSelectedId] = useState(system.id);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? system;
  const selectedParentId = parentMap.get(selectedNode.id);
  const selectedParent = nodes.find((node) => node.id === selectedParentId);
  const selectedChildren = selectedNode.children ?? [];

  const matchedLocation = useMemo(() => {
    const name = selectedNode.name.toLowerCase();
    return locations.find((location) => location.name.toLowerCase() === name) ?? null;
  }, [locations, selectedNode.name]);

  const positionedNodes = useMemo(() => {
    const centerX = 240;
    const centerY = 200;
    const output: PositionedNode[] = [
      { node: system, x: centerX, y: centerY },
    ];

    const primaryBodies = system.children ?? [];
    primaryBodies.forEach((child, index) => {
      const angle = (index / primaryBodies.length) * Math.PI * 2 - Math.PI / 2;
      const radius = child.orbitRadius ?? 160 + index * 40;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      output.push({ node: child, x, y });

      const satellites = child.children ?? [];
      satellites.forEach((satellite, satelliteIndex) => {
        const satelliteAngle = angle + (satelliteIndex + 1) * 0.8;
        const satelliteRadius = 40 + satelliteIndex * 12;
        output.push({
          node: satellite,
          x: x + Math.cos(satelliteAngle) * satelliteRadius,
          y: y + Math.sin(satelliteAngle) * satelliteRadius,
        });
      });
    });

    return output;
  }, [system]);

  function renderNavigatorItem(node: SystemNode, depth = 0) {
    const isSelected = node.id === selectedId;
    const children = node.children ?? [];

    return (
      <div key={node.id} className="space-y-2">
        <button
          type="button"
          onClick={() => setSelectedId(node.id)}
          className={cn(
            'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
            isSelected
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent bg-muted/40 text-foreground hover:border-muted'
          )}
          style={{ marginLeft: depth * 12 }}
        >
          <div>
            <div className="font-medium">{node.name}</div>
            <div className="text-xs text-muted-foreground">{node.kind}</div>
          </div>
        </button>
        {children.length > 0 && (
          <div className="space-y-2">
            {children.map((child) => renderNavigatorItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Map Mode</h2>
          <p className="text-sm text-muted-foreground">
            Prototype solar system view seeded from local data (swap in YAML-based .md sources next).
          </p>
        </div>
        <Button variant="outline" onClick={onExit}>
          Back to Location Database
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">System Navigator</CardTitle>
            <CardDescription>Select a body to see its map context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderNavigatorItem(system)}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Aurora System Overview</CardTitle>
              <CardDescription>Click a node in the map or navigator to drill in.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/20 p-4">
                <svg
                  viewBox="0 0 480 400"
                  className="h-[320px] w-full"
                  role="img"
                  aria-label="Procedurally generated star system"
                >
                  {positionedNodes.map(({ node, x, y }) => {
                    if (node.id === system.id) return null;
                    return (
                      <circle
                        key={`orbit-${node.id}`}
                        cx={240}
                        cy={200}
                        r={Math.hypot(x - 240, y - 200)}
                        fill="none"
                        stroke="rgba(148,163,184,0.25)"
                        strokeDasharray="4 6"
                      />
                    );
                  })}
                  {positionedNodes.map(({ node, x, y }) => (
                    <g key={node.id} onClick={() => setSelectedId(node.id)} className="cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r={node.kind === 'Star' ? 18 : node.kind === 'Planet' ? 10 : 6}
                        fill={node.id === selectedId ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                        opacity={node.kind === 'Star' ? 0.9 : 0.7}
                      />
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="hsl(var(--foreground))"
                      >
                        {node.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{selectedNode.name}</CardTitle>
              <CardDescription>
                {selectedNode.kind}
                {selectedParent ? ` • Orbits ${selectedParent.name}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedNode.description ?? 'No description yet. Add lore and map imagery for this location.'}
              </p>

              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Map image placeholder — upload or link a rendered map for this location.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={!matchedLocation} asChild={!!matchedLocation}>
                  {matchedLocation ? (
                    <Link to={`/locations/${matchedLocation.id}`}>Open location card</Link>
                  ) : (
                    <span>Open location card</span>
                  )}
                </Button>
                <Button variant="outline">Attach map image</Button>
              </div>

              {selectedChildren.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Sub-locations</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedChildren.map((child) => (
                      <Button
                        key={child.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedId(child.id)}
                      >
                        {child.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!matchedLocation && (
                <p className="text-xs text-muted-foreground">
                  Tip: create a location with the same name to enable quick linking from this map.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
