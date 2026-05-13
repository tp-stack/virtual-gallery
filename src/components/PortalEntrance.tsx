"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PORTAL_DURATION = 4;
const FRAME_COUNT = 48;

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function PortalScene({ onComplete, artworks }: { onComplete: () => void; artworks: any[] }) {
  const { camera } = useThree();
  const startTime = useRef(Date.now());
  const ready = useRef(false);
  const texturesRef = useRef<THREE.Texture[]>([]);
  const frameRefs = useRef<{ mesh: THREE.Mesh; startPos: THREE.Vector3; startRot: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const urls = artworks
      .map((a) => a.image_url_3d || a.image_url)
      .filter(Boolean)
      .slice(0, FRAME_COUNT);

    Promise.allSettled(urls.map(loadTexture)).then((results) => {
      texturesRef.current = results
        .filter((r) => r.status === "fulfilled")
        .map((r: any) => r.value);

      // Fallback: fill remaining with placeholder
      while (texturesRef.current.length < FRAME_COUNT) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#161616";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "#C8A96A";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 216, 216);
        const tex = new THREE.CanvasTexture(canvas);
        texturesRef.current.push(tex);
      }

      ready.current = true;
      setLoaded(true);
    });
  }, [artworks]);

  // Build frame geometries once
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 1.6), []);
  const frameGeo = useMemo(() => new THREE.BoxGeometry(2.3, 1.9, 0.08), []);

  // Track animation progress
  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const t = Math.min(elapsed / PORTAL_DURATION, 1);

    // Ease in-out
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Move camera forward through the tunnel
    const zStart = -20;
    const zEnd = 0;
    camera.position.set(0, 0, zStart + (zEnd - zStart) * ease);
    camera.lookAt(0, 0, zEnd + 10);

    // Rotate frames outward slightly as camera passes
    if (frameRefs.current.length > 0) {
      for (const f of frameRefs.current) {
        const localT = Math.max(0, Math.min(1, (camera.position.z - f.startPos.z + 10) / 20));
        f.mesh.rotation.z = f.startRot * (1 - localT) * 0.5;
      }
    }

    // Complete
    if (t >= 1) {
      onComplete();
    }
  });

  if (!loaded) return null;

  // Generate frame positions in a helical tunnel
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const angle = (i / FRAME_COUNT) * Math.PI * 6;
    const radius = 6 - (i / FRAME_COUNT) * 3;
    const z = -20 + (i / FRAME_COUNT) * 22;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.5 + 0.5;
    const texIdx = i % texturesRef.current.length;
    frames.push({ x, y, z, angle, texIdx });
  }

  return (
    <group>
      {/* Ambient */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, -5]} intensity={0.8} color="#C8A96A" />

      {/* Frames */}
      {frames.map((f, i) => {
        const tex = texturesRef.current[f.texIdx];
        return (
          <group key={i} position={[f.x, f.y, f.z]} rotation={[0, 0, f.angle * 0.1]}>
            {/* Gold frame */}
            <mesh position={[0, 0, -0.05]}>
              <boxGeometry args={[2.3, 1.9, 0.08]} />
              <meshStandardMaterial color="#8B7355" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Artwork */}
            <mesh>
              <planeGeometry args={[2, 1.6]} />
              <meshStandardMaterial
                map={tex}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Glow at the end */}
      <mesh position={[0, 0, 3]} rotation={[0, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial color="#C8A96A" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function PortalEntrance({ onComplete }: { onComplete: () => void }) {
  const [artworks, setArtworks] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/artworks?limit=100")
      .then((r) => r.json())
      .then((d) => setArtworks(d.data || []));
  }, []);

  if (artworks.length === 0) {
    return (
      <div className="w-screen h-screen bg-[#050505]" />
    );
  }

  return (
    <div className="w-screen h-screen bg-[#050505]">
      <Canvas camera={{ fov: 75, near: 0.1, far: 50, position: [0, 0, -20] }} onCreated={({ gl }) => gl.setClearColor("#050505")}>
        <PortalScene artworks={artworks} onComplete={onComplete} />
      </Canvas>
    </div>
  );
}
