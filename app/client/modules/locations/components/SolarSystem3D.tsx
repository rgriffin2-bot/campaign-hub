/**
 * SolarSystem3D.tsx
 *
 * Three.js / R3F 3D solar system map — hi-tech holographic display aesthetic.
 * Features: procedural nebula skybox (FBM), instanced asteroid belts,
 * Fresnel rim glow, star glow sprite, HUD corner brackets, CSS scanline overlay.
 */

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import * as THREE from 'three';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location';

// ── Scale ──────────────────────────────────────────────────────────────────
const ORBIT_SCALE = 1 / 25;
const RADIUS_SCALE = 1 / 45;
const INITIAL_CAM: [number, number, number] = [0, 30, 52];

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_RADII: Record<string, number> = {
  star: 60, planet: 25, moon: 12, station: 8, asteroid_ring: 20,
};
const DEFAULT_COLORS: Record<string, string> = {
  star: '#FDB813', planet: '#4A90D9', moon: '#9CA3AF',
  station: '#8B5CF6', asteroid_ring: '#6B7280',
};

// ── Types ──────────────────────────────────────────────────────────────────

interface CelestialLocation extends FileMetadata {
  celestial: CelestialData;
  parent?: string;
}

interface Vec3 { x: number; y: number; z: number; }

// ── GLSL: Procedural Nebula Skybox ─────────────────────────────────────────
// Multi-octave FBM noise on a back-face sphere. No textures needed.

const NEBULA_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAG = /* glsl */`
  varying vec3 vDir;

  float nhash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float snoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(nhash(i),              nhash(i+vec3(1,0,0)), f.x),
          mix(nhash(i+vec3(0,1,0)),  nhash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(nhash(i+vec3(0,0,1)),  nhash(i+vec3(1,0,1)), f.x),
          mix(nhash(i+vec3(0,1,1)),  nhash(i+vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    mat3 rot = mat3(0.8,-0.6,0.0, 0.6,0.8,0.0, 0.0,0.0,1.0);
    for (int i = 0; i < 3; i++) {
      v += a * snoise(p);
      p = rot * p * 2.1 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);

    float n1 = fbm(d * 2.8);
    float n2 = fbm(d * 5.5 + vec3(1.7, 2.3, 4.1));

    vec3 c1 = vec3(0.08, 0.03, 0.22);  // deep violet
    vec3 c2 = vec3(0.02, 0.10, 0.30);  // deep blue
    vec3 c3 = vec3(0.00, 0.18, 0.20);  // teal

    vec3 col = mix(c1, c2, n1);
    col = mix(col, c3, n2 * 0.55);
    col *= 1.5;

    float density = n1 * 0.7 + n2 * 0.3;
    float alpha = smoothstep(0.28, 0.72, density) * 0.55;

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── GLSL: Fresnel Rim ──────────────────────────────────────────────────────

const FRESNEL_VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vec4 vp   = modelViewMatrix * vec4(position, 1.0);
    vViewDir  = normalize(-vp.xyz);
    gl_Position = projectionMatrix * vp;
  }
`;

const FRESNEL_FRAG = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3  uColor;
  uniform float uOpacity;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.5);
    gl_FragColor = vec4(uColor, f * uOpacity);
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function hashFloat(id: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return min + (Math.abs(h) % 1000) / 1000 * (max - min);
}

function getInclination(id: string): number {
  return hashFloat(id + '_incl', -0.18, 0.18);
}

function orbitSpeed(orbitDist: number): number {
  return 0.28 / Math.max(orbitDist, 0.5);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Static Position Calculator ─────────────────────────────────────────────

function build3DPositions(locations: CelestialLocation[]): Map<string, Vec3> {
  const posMap = new Map<string, Vec3>();

  const rootBodies = locations.filter((loc) => {
    if (!loc.parent) return true;
    return !locations.find((p) => p.id === loc.parent);
  });

  if (rootBodies.length === 1) {
    posMap.set(rootBodies[0].id, { x: 0, y: 0, z: 0 });
  } else {
    rootBodies.forEach((loc, i) => {
      const angle = (i / rootBodies.length) * Math.PI * 2;
      posMap.set(loc.id, { x: 12 * Math.cos(angle), y: 0, z: 12 * Math.sin(angle) });
    });
  }

  function processChildren(parentId: string) {
    const parentPos = posMap.get(parentId);
    if (!parentPos) return;
    for (const child of locations.filter((l) => l.parent === parentId)) {
      const c = child.celestial;
      const dist = (c.orbitDistance ?? 200) * ORBIT_SCALE;
      const startAngle = ((c.startPosition ?? 0) * Math.PI) / 180;
      const ecc = c.orbitEccentricity ?? 0;
      const rotRad = ((c.orbitRotation ?? 0) * Math.PI) / 180;
      const inclRad = getInclination(child.id);
      const cosR = Math.cos(rotRad), sinR = Math.sin(rotRad);
      let lx: number, lz: number;
      if (c.orbitShape === 'ellipse' && ecc > 0) {
        const b = dist * Math.sqrt(1 - ecc ** 2);
        lx = dist * Math.cos(startAngle);
        lz = b * Math.sin(startAngle);
      } else {
        lx = dist * Math.cos(startAngle);
        lz = dist * Math.sin(startAngle);
      }
      posMap.set(child.id, {
        x: parentPos.x + lx * cosR - lz * sinR,
        y: parentPos.y + dist * Math.sin(inclRad) * Math.sin(startAngle),
        z: parentPos.z + lx * sinR + lz * cosR,
      });
      processChildren(child.id);
    }
  }

  rootBodies.forEach((r) => processChildren(r.id));
  return posMap;
}

// ── Hex Grid Floor (static) ────────────────────────────────────────────────

function HexGridFloor() {
  const geo = useMemo(() => {
    const SIZE = 3.5;
    const EXTENT = 90;
    const SQ3 = Math.sqrt(3);
    const colWidth = SQ3 * SIZE;
    const rowHeight = SIZE * 1.5;
    const segs: number[] = [];

    function addHex(cx: number, cz: number) {
      if (cx * cx + cz * cz > (EXTENT * 1.15) ** 2) return;
      for (let i = 0; i < 6; i++) {
        const a1 = (Math.PI / 3) * i;
        const a2 = (Math.PI / 3) * (i + 1);
        segs.push(
          cx + SIZE * Math.cos(a1), 0, cz + SIZE * Math.sin(a1),
          cx + SIZE * Math.cos(a2), 0, cz + SIZE * Math.sin(a2),
        );
      }
    }

    let row = 0;
    for (let cz = -EXTENT; cz <= EXTENT; cz += rowHeight, row++) {
      const offset = row % 2 === 0 ? 0 : colWidth / 2;
      for (let cx = -EXTENT + offset; cx <= EXTENT; cx += colWidth) {
        addHex(cx, cz);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#071c2c" opacity={0.5} transparent />
    </lineSegments>
  );
}

// ── Nebula Skybox ──────────────────────────────────────────────────────────
// FBM noise shader on a large back-face sphere — no texture files needed.

function NebulaSkybox() {
  return (
    <mesh>
      <sphereGeometry args={[350, 32, 24]} />
      <shaderMaterial
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ── Orbit Trail ────────────────────────────────────────────────────────────

const TRAIL_SEGS = 28;
const TRAIL_SPAN = 0.7;

function OrbitTrail({
  loc, parentLivePos, inclRad,
}: {
  loc: CelestialLocation;
  parentLivePos: MutableRefObject<THREE.Vector3>;
  inclRad: number;
}) {
  const c = loc.celestial;
  const orbitDist = (c.orbitDistance ?? 200) * ORBIT_SCALE;
  const speed = orbitSpeed(orbitDist);
  const startAngle = ((c.startPosition ?? 0) * Math.PI) / 180;
  const ecc = c.orbitEccentricity ?? 0;
  const rotRad = ((c.orbitRotation ?? 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad), sinR = Math.sin(rotRad);
  const color = c.color ?? DEFAULT_COLORS[c.bodyType] ?? '#ffffff';

  const lineObj = useMemo(() => {
    const positions = new Float32Array(TRAIL_SEGS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
    return new THREE.Line(geo, mat);
  }, [color]);

  useEffect(
    () => () => { lineObj.geometry.dispose(); (lineObj.material as THREE.Material).dispose(); },
    [lineObj],
  );

  useFrame(({ clock }) => {
    const currentAngle = startAngle + clock.elapsedTime * speed;
    const a = orbitDist;
    const b = ecc > 0 ? a * Math.sqrt(1 - ecc ** 2) : a;
    const pp = parentLivePos.current;
    const attr = lineObj.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < TRAIL_SEGS; i++) {
      const angle = currentAngle - TRAIL_SPAN * (1 - i / TRAIL_SEGS);
      const lx = a * Math.cos(angle), lz = b * Math.sin(angle);
      arr[i * 3]     = pp.x + lx * cosR - lz * sinR;
      arr[i * 3 + 1] = pp.y + a * Math.sin(inclRad) * Math.sin(angle);
      arr[i * 3 + 2] = pp.z + lx * sinR + lz * cosR;
    }
    attr.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
}

// ── Instanced Asteroid Belt ────────────────────────────────────────────────
// Replaces the wireframe torus. Each asteroid is a tiny icosahedron that tumbles.

const ASTEROID_COUNT = 1000;

function InstancedAsteroidBelt({ loc, parentPos }: { loc: CelestialLocation; parentPos: Vec3 }) {
  const c = loc.celestial;
  const orbitDist = (c.orbitDistance ?? 200) * ORBIT_SCALE;
  const ringWidth = ((c.ringWidth ?? 40) * ORBIT_SCALE) / 2;

  const meshRef = useRef<THREE.InstancedMesh>(null);

  const [geo, mat] = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.055, 0);
    const m = new THREE.MeshBasicMaterial({ wireframe: true });
    return [g, m];
  }, []);

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  // Set all instance matrices and colors once — no per-frame updates needed
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = orbitDist + (Math.random() - 0.5) * ringWidth * 2.5;
      dummy.position.set(
        parentPos.x + r * Math.cos(angle),
        (Math.random() - 0.5) * ringWidth * 0.4,
        parentPos.z + r * Math.sin(angle),
      );
      dummy.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      dummy.scale.setScalar(0.4 + Math.random() * 1.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.06 + Math.random() * 0.09, 0.1 + Math.random() * 0.25, 0.22 + Math.random() * 0.32);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [orbitDist, ringWidth, parentPos.x, parentPos.z]);

  return <instancedMesh ref={meshRef} args={[geo, mat, ASTEROID_COUNT]} />;
}

// ── Wireframe Bodies ───────────────────────────────────────────────────────

function StarBody({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(radius, 2);
    const wf = new THREE.WireframeGeometry(base);
    base.dispose();
    return wf;
  }, [radius]);
  useFrame((_, dt) => {
    if (ref.current) { ref.current.rotation.y += dt * 0.3; ref.current.rotation.x += dt * 0.1; }
  });
  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial color={color} /></lineSegments>;
}

function PlanetBody({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const b = new THREE.IcosahedronGeometry(radius, 1);
    const wf = new THREE.WireframeGeometry(b);
    b.dispose();
    return wf;
  }, [radius]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed; });
  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial color={color} /></lineSegments>;
}

function MoonBody({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const b = new THREE.IcosahedronGeometry(radius, 1);
    const wf = new THREE.WireframeGeometry(b);
    b.dispose();
    return wf;
  }, [radius]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed; });
  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial color={color} /></lineSegments>;
}

function StationBody({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const b = new THREE.OctahedronGeometry(radius);
    const wf = new THREE.WireframeGeometry(b);
    b.dispose();
    return wf;
  }, [radius]);
  useFrame((_, dt) => {
    if (ref.current) { ref.current.rotation.y += dt * speed; ref.current.rotation.z += dt * speed * 0.4; }
  });
  return <lineSegments ref={ref} geometry={geo}><lineBasicMaterial color={color} /></lineSegments>;
}

// ── Fresnel Rim Atmosphere ─────────────────────────────────────────────────

function FresnelRim({ radius, color, rimScale = 1.8, opacity = 0.65 }: {
  radius: number; color: string; rimScale?: number; opacity?: number;
}) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  }), [color, opacity]);

  return (
    <mesh>
      <sphereGeometry args={[radius * rimScale, 20, 14]} />
      <shaderMaterial
        vertexShader={FRESNEL_VERT}
        fragmentShader={FRESNEL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Star Glow Sprite ───────────────────────────────────────────────────────

function StarGlow({ radius, color }: { radius: number; color: string }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const baseScale = radius * 3.5; // tight glow — just slightly larger than the star

  const material = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0.0,  hexToRgba(color, 1.0));
    grad.addColorStop(0.15, hexToRgba(color, 0.55));
    grad.addColorStop(0.5,  hexToRgba(color, 0.12));
    grad.addColorStop(1.0,  hexToRgba(color, 0.0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color]);

  useEffect(() => () => { material.map?.dispose(); material.dispose(); }, [material]);

  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const pulse = 1.0 + Math.sin(clock.elapsedTime * 0.7) * 0.08;
      spriteRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
    }
  });

  return <sprite ref={spriteRef} material={material} />;
}

// ── HUD Corner Brackets (3D) ────────────────────────────────────────────────
// Camera-facing bracket corners that scale with the body in world space.

function HudBrackets({ radius }: { radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);

  const half = radius * 1.45;
  const arm = half * 0.4;

  // lineSegments draws pairs: (v0–v1), (v2–v3), etc. Each L-corner = 2 pairs.
  const geo = useMemo(() => {
    const pts = [
      // top-left: horizontal arm then vertical arm
      -half + arm, half, 0,  -half, half, 0,
      -half, half, 0,        -half, half - arm, 0,
      // top-right
      half - arm, half, 0,   half, half, 0,
      half, half, 0,         half, half - arm, 0,
      // bottom-left
      -half + arm, -half, 0, -half, -half, 0,
      -half, -half, 0,       -half, -half + arm, 0,
      // bottom-right
      half - arm, -half, 0,  half, -half, 0,
      half, -half, 0,        half, -half + arm, 0,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [half, arm]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color="#3B82F6" />
      </lineSegments>
    </group>
  );
}

// ── Equatorial Ring ────────────────────────────────────────────────────────

function EquatorialRing({ radius, color }: { radius: number; color: string }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius * 1.75, 0, Math.sin(a) * radius * 1.75));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color={color} opacity={0.25} transparent />
    </lineLoop>
  );
}

// ── Floor Marker ───────────────────────────────────────────────────────────

function FloorMarker({ color }: { color: string }) {
  const r = 0.2;
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.01, Math.sin(a) * r));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color={color} opacity={0.28} transparent />
    </lineLoop>
  );
}

// ── Animated Body Node ─────────────────────────────────────────────────────

interface BodyNodeProps {
  loc: CelestialLocation;
  initialPos: Vec3;
  parentLivePos: MutableRefObject<THREE.Vector3>;
  ownLivePos: MutableRefObject<THREE.Vector3>;
  isSelected: boolean;
  onSelect: (loc: CelestialLocation) => void;
}

function CelestialBodyNode({
  loc, initialPos, parentLivePos, ownLivePos, isSelected, onSelect,
}: BodyNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const c = loc.celestial;
  const bodyType = c.bodyType;
  const radius = (c.radius ?? DEFAULT_RADII[bodyType] ?? 20) * RADIUS_SCALE;
  const color = c.color ?? DEFAULT_COLORS[bodyType] ?? '#ffffff';
  const rotSpeed = useMemo(() => hashFloat(loc.id, 0.1, 0.45), [loc.id]);
  const inclRad = useMemo(() => getInclination(loc.id), [loc.id]);

  const isOrbiting = !!loc.parent;
  const orbitDist = (c.orbitDistance ?? 200) * ORBIT_SCALE;
  const speed = orbitSpeed(orbitDist);
  const startAngle = ((c.startPosition ?? 0) * Math.PI) / 180;
  const ecc = c.orbitEccentricity ?? 0;
  const rotRad = ((c.orbitRotation ?? 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad), sinR = Math.sin(rotRad);

  useFrame(({ clock }) => {
    if (!groupRef.current || !isOrbiting) return;
    const angle = startAngle + clock.elapsedTime * speed;
    const a = orbitDist;
    const b = c.orbitShape === 'ellipse' ? a * Math.sqrt(1 - ecc ** 2) : a;
    const lx = a * Math.cos(angle), lz = b * Math.sin(angle);
    const pp = parentLivePos.current;
    const x = pp.x + lx * cosR - lz * sinR;
    const y = pp.y + a * Math.sin(inclRad) * Math.sin(angle);
    const z = pp.z + lx * sinR + lz * cosR;
    groupRef.current.position.set(x, y, z);
    ownLivePos.current.set(x, y, z);
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(loc);
  }, [loc, onSelect]);

  if (bodyType === 'asteroid_ring') return null;
  const isStar = bodyType === 'star';

  return (
    <group ref={groupRef} position={[initialPos.x, initialPos.y, initialPos.z]}>

      {/* Fresnel rim: tight corona for stars, atmosphere halo for others */}
      {isStar
        ? <FresnelRim radius={radius} color={color} rimScale={1.5} opacity={0.28} />
        : <FresnelRim radius={radius} color={color} rimScale={1.9} opacity={0.65} />
      }

      {/* Soft radial glow billboard (stars only) */}
      {isStar && <StarGlow radius={radius} color={color} />}

      {/* Selection brackets */}
      {isSelected && <HudBrackets radius={radius} />}

      {/* Body mesh */}
      {isStar      && <StarBody    radius={radius} color={color} />}
      {bodyType === 'planet'  && <PlanetBody  radius={radius} color={color} speed={rotSpeed} />}
      {bodyType === 'moon'    && <MoonBody    radius={radius} color={color} speed={rotSpeed} />}
      {bodyType === 'station' && <StationBody radius={radius} color={color} speed={rotSpeed} />}

      {!isStar && <EquatorialRing radius={radius} color={color} />}

      {/* Click target — tightly fitted to the body */}
      <mesh visible={false} onClick={handleClick}>
        <sphereGeometry args={[radius * 1.1, 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      <FloorMarker color={color} />

      {c.showLabel !== false && (
        <Html position={[0, radius + 0.35, 0]} center distanceFactor={16} occlude={false}>
          <div style={{
            color: isSelected ? '#93C5FD' : '#5a7a8e',
            fontSize: '10px',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(0,0,0,1)',
          }}>
            {loc.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Camera Controller ──────────────────────────────────────────────────────

function CameraController({
  resetRef,
  focusRef,
}: {
  resetRef: MutableRefObject<(() => void) | null>;
  focusRef: MutableRefObject<((target: THREE.Vector3, radius: number) => void) | null>;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as THREE.EventDispatcher & {
    target: THREE.Vector3; update: () => void;
  } | null;

  const animRef = useRef<{
    targetPos: THREE.Vector3;
    camGoal: THREE.Vector3;
    progress: number;
    startCam: THREE.Vector3;
    startTarget: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    resetRef.current = () => {
      animRef.current = null;
      camera.position.set(INITIAL_CAM[0], INITIAL_CAM[1], INITIAL_CAM[2]);
      if (controls && 'target' in controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      } else {
        camera.lookAt(0, 0, 0);
      }
    };
  }, [camera, controls, resetRef]);

  useEffect(() => {
    focusRef.current = (target: THREE.Vector3, radius: number) => {
      const offset = Math.max(radius * 8, 4);
      animRef.current = {
        targetPos: target.clone(),
        camGoal: new THREE.Vector3(target.x + offset * 0.5, target.y + offset * 0.6, target.z + offset),
        progress: 0,
        startCam: camera.position.clone(),
        startTarget: controls && 'target' in controls ? controls.target.clone() : target.clone(),
      };
    };
  }, [camera, controls, focusRef]);

  useFrame((_, dt) => {
    const anim = animRef.current;
    if (!anim || !controls || !('target' in controls)) return;
    anim.progress = Math.min(anim.progress + dt * 1.8, 1);
    const t = 1 - Math.pow(1 - anim.progress, 3); // ease-out cubic
    camera.position.lerpVectors(anim.startCam, anim.camGoal, t);
    controls.target.lerpVectors(anim.startTarget, anim.targetPos, t);
    controls.update();
    if (anim.progress >= 1) animRef.current = null;
  });

  return null;
}

// ── Scene Content ──────────────────────────────────────────────────────────

interface SceneContentProps {
  locations: CelestialLocation[];
  selectedId: string | null;
  onSelect: (loc: CelestialLocation) => void;
  livePosMapRef: MutableRefObject<Map<string, MutableRefObject<THREE.Vector3>>>;
}

function SceneContent({ locations, selectedId, onSelect, livePosMapRef }: SceneContentProps) {
  const staticPos = useMemo(() => build3DPositions(locations), [locations]);

  const livePosMap = useRef<Map<string, MutableRefObject<THREE.Vector3>>>(new Map());

  const posRefs = useMemo(() => {
    const map = new Map<string, MutableRefObject<THREE.Vector3>>();
    for (const loc of locations) {
      const p = staticPos.get(loc.id) ?? { x: 0, y: 0, z: 0 };
      const existing = livePosMap.current.get(loc.id);
      if (existing) {
        existing.current.set(p.x, p.y, p.z);
        map.set(loc.id, existing);
      } else {
        map.set(loc.id, { current: new THREE.Vector3(p.x, p.y, p.z) });
      }
    }
    livePosMap.current = map;
    livePosMapRef.current = map;
    return map;
  }, [locations, staticPos, livePosMapRef]);

  const originRef = useRef(new THREE.Vector3(0, 0, 0));

  const allOrbiters = locations.filter((l) => l.parent && l.celestial.bodyType !== 'asteroid_ring');

  return (
    <>
      <HexGridFloor />
      <NebulaSkybox />

      {/* Orbit trails */}
      {allOrbiters.map((loc) => {
        const parentRef = posRefs.get(loc.parent!) ?? { current: originRef.current };
        return (
          <OrbitTrail
            key={`trail-${loc.id}`}
            loc={loc}
            parentLivePos={parentRef}
            inclRad={getInclination(loc.id)}
          />
        );
      })}

      {/* Instanced asteroid belts */}
      {locations
        .filter((loc) => loc.celestial.bodyType === 'asteroid_ring' && loc.parent)
        .map((loc) => {
          const parentInitial = staticPos.get(loc.parent!);
          if (!parentInitial) return null;
          return <InstancedAsteroidBelt key={loc.id} loc={loc} parentPos={parentInitial} />;
        })}

      {/* Celestial bodies */}
      {locations
        .filter((loc) => loc.celestial.bodyType !== 'asteroid_ring')
        .map((loc) => {
          const initialPos = staticPos.get(loc.id) ?? { x: 0, y: 0, z: 0 };
          const ownRef = posRefs.get(loc.id) ?? { current: new THREE.Vector3() };
          const parentRef = loc.parent
            ? (posRefs.get(loc.parent) ?? { current: originRef.current })
            : { current: originRef.current };
          return (
            <CelestialBodyNode
              key={loc.id}
              loc={loc}
              initialPos={initialPos}
              parentLivePos={parentRef}
              ownLivePos={ownRef}
              isSelected={selectedId === loc.id}
              onSelect={onSelect}
            />
          );
        })}
    </>
  );
}

// ── GPU Post-Processing: Holographic Display Effect ─────────────────────────
// Uses Three.js EffectComposer + ShaderPass for scanlines, sweep band,
// chromatic aberration, vignette, and film grain.

const HolographicShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Chromatic aberration
      float ca = 0.0012;
      float r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
      vec3 col = vec3(r, g, b);

      // Scanlines
      float scanline = sin(gl_FragCoord.y * 1.8) * 0.5 + 0.5;
      col *= 0.92 + 0.08 * scanline;

      // Sweep band
      float sweep = fract(uTime * 0.07);
      float d = min(abs(uv.y - sweep), min(abs(uv.y - sweep + 1.0), abs(uv.y - sweep - 1.0)));
      float glow = exp(-d * 16.0) * 0.14;
      col += vec3(glow * 0.15, glow * 0.4, glow * 0.95);

      // Vignette
      vec2 vc = (uv - 0.5) * 2.0;
      col *= 1.0 - dot(vc, vc) * 0.35;

      // Film grain
      vec2 seed = gl_FragCoord.xy + fract(uTime) * 1000.0;
      vec3 p3 = fract(vec3(seed.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      col += (fract((p3.x + p3.y) * p3.z) - 0.5) * 0.035;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function PostEffects() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const passRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const pass = new ShaderPass(HolographicShader);
    composer.addPass(pass);
    composerRef.current = composer;
    passRef.current = pass;
    return () => { composer.dispose(); };
  }, [gl, scene, camera]);

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  useFrame((_, delta) => {
    if (passRef.current) {
      passRef.current.uniforms.uTime.value += delta;
    }
    composerRef.current?.render(delta);
  }, 1);

  return null;
}

// ── Public API ─────────────────────────────────────────────────────────────

interface SolarSystem3DProps {
  locations: FileMetadata[];
  selectedId: string | null;
  onSelect: (loc: FileMetadata | null) => void;
}

export function SolarSystem3D({ locations, selectedId, onSelect }: SolarSystem3DProps) {
  const resetRef = useRef<(() => void) | null>(null);
  const focusRef = useRef<((target: THREE.Vector3, radius: number) => void) | null>(null);
  const livePosMapRef = useRef<Map<string, MutableRefObject<THREE.Vector3>>>(new Map());

  const celestialLocs = useMemo(
    () => locations.filter((loc): loc is CelestialLocation => !!loc.celestial),
    [locations],
  );

  const handleSelect = useCallback(
    (loc: CelestialLocation) => { onSelect(selectedId === loc.id ? null : loc); },
    [selectedId, onSelect],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return celestialLocs.filter((l) => l.celestial.bodyType !== 'asteroid_ring');
    const q = searchQuery.toLowerCase();
    return celestialLocs
      .filter((l) => l.celestial.bodyType !== 'asteroid_ring' && l.name.toLowerCase().includes(q));
  }, [searchQuery, celestialLocs]);

  const handleSearchSelect = useCallback((loc: CelestialLocation) => {
    onSelect(loc);
    setSearchOpen(false);
    setSearchQuery('');
    const posRef = livePosMapRef.current.get(loc.id);
    if (posRef && focusRef.current) {
      const radius = (loc.celestial.radius ?? DEFAULT_RADII[loc.celestial.bodyType] ?? 20) * RADIUS_SCALE;
      focusRef.current(posRef.current, radius);
    }
  }, [onSelect]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#93C5FD',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '11px',
    letterSpacing: '0.08em',
    padding: '6px 0',
  };

  const bodyTypeIcon: Record<string, string> = {
    star: '\u2606', planet: '\u25CB', moon: '\u00B7', station: '\u25C7',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: INITIAL_CAM, fov: 52 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#03050e' }}
        onPointerMissed={() => onSelect(null)}
      >
        <Stars radius={180} depth={60} count={2500} factor={3} saturation={0} speed={0} />
        <CameraController resetRef={resetRef} focusRef={focusRef} />
        <SceneContent locations={celestialLocs} selectedId={selectedId} onSelect={handleSelect} livePosMapRef={livePosMapRef} />
        <OrbitControls makeDefault minDistance={2} maxDistance={220} enablePan enableDamping dampingFactor={0.07} />
        <PostEffects />
      </Canvas>

      {/* Search bar */}
      <div style={{
        position: 'absolute', top: 56, left: 12, zIndex: 12, width: 220,
      }}>
        <div style={{
          background: 'rgba(4, 8, 22, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '4px',
          padding: '0 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: '#475569', fontSize: '12px' }}>&#x2315;</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            placeholder="SEARCH BODIES..."
            style={inputStyle}
          />
        </div>
        {searchOpen && (
          <div
            style={{
              marginTop: 4,
              background: 'rgba(4, 8, 22, 0.95)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '4px',
              maxHeight: 200,
              overflowY: 'auto',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {searchResults.length === 0 ? (
              <div style={{
                padding: '8px 10px', color: '#475569',
                fontFamily: 'ui-monospace, monospace', fontSize: '10px',
              }}>
                NO MATCHES
              </div>
            ) : (
              searchResults.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSearchSelect(loc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '6px 10px',
                    background: selectedId === loc.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'ui-monospace, monospace', fontSize: '10px',
                    letterSpacing: '0.08em', color: '#8899aa',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#93C5FD'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selectedId === loc.id ? 'rgba(59,130,246,0.12)' : 'transparent'; e.currentTarget.style.color = '#8899aa'; }}
                >
                  <span style={{ color: loc.celestial.color ?? DEFAULT_COLORS[loc.celestial.bodyType] ?? '#fff', fontSize: '13px' }}>
                    {bodyTypeIcon[loc.celestial.bodyType] ?? '\u25CB'}
                  </span>
                  <span style={{ textTransform: 'uppercase', flex: 1 }}>{loc.name}</span>
                  <span style={{ color: '#3a4a56', fontSize: '9px', textTransform: 'uppercase' }}>
                    {loc.celestial.bodyType}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => resetRef.current?.()}
        style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 11,
          background: 'rgba(4, 8, 22, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '4px', color: '#475569',
          fontFamily: 'ui-monospace, monospace', fontSize: '10px',
          letterSpacing: '0.12em', padding: '5px 10px', cursor: 'pointer',
          textTransform: 'uppercase', transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#93C5FD'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; }}
      >
        Reset View
      </button>
    </div>
  );
}
