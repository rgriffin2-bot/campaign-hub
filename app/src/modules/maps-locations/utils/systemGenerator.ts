export type SystemKind = 'Star' | 'Planet' | 'Moon' | 'Station' | 'Asteroid Belt';

export interface SystemNode {
  id: string;
  name: string;
  kind: SystemKind;
  description?: string;
  orbitRadius?: number;
  children?: SystemNode[];
}

export function generateSeedSystem(): SystemNode {
  return {
    id: 'system-aurora',
    name: 'Aurora System',
    kind: 'Star',
    description: 'A bright, pulse-heavy star that anchors the trade lanes.',
    children: [
      {
        id: 'planet-helia',
        name: 'Helia',
        kind: 'Planet',
        orbitRadius: 140,
        description: 'A humid jungle world with a booming biotics market.',
        children: [
          {
            id: 'station-helia-gate',
            name: 'Helia Gate',
            kind: 'Station',
            description: 'Orbital transfer hub with customs and refuel berths.',
          },
          {
            id: 'moon-helia-echo',
            name: 'Echo',
            kind: 'Moon',
            description: 'Mining operations and listening arrays buried in ice.',
          },
        ],
      },
      {
        id: 'planet-caldera',
        name: 'Caldera',
        kind: 'Planet',
        orbitRadius: 220,
        description: 'A volcanic forge world ruled by guild consortiums.',
        children: [
          {
            id: 'station-caldera-spur',
            name: 'Spur Station',
            kind: 'Station',
            description: 'Dockyards and ship-breaker yards in constant rebuild.',
          },
        ],
      },
      {
        id: 'belt-crown',
        name: 'Crown Belt',
        kind: 'Asteroid Belt',
        orbitRadius: 300,
        description: 'A dense belt dotted with pirate enclaves and survey rigs.',
        children: [
          {
            id: 'station-crown-outpost',
            name: 'Crown Outpost',
            kind: 'Station',
            description: 'Listening post disguised as a salvage depot.',
          },
        ],
      },
    ],
  };
}

export function flattenSystem(node: SystemNode): SystemNode[] {
  const list: SystemNode[] = [node];
  node.children?.forEach((child) => {
    list.push(...flattenSystem(child));
  });
  return list;
}

export function getSystemParentMap(node: SystemNode, parentId?: string, map = new Map<string, string | undefined>()) {
  map.set(node.id, parentId);
  node.children?.forEach((child) => {
    getSystemParentMap(child, node.id, map);
  });
  return map;
}
