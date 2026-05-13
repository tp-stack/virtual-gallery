"use client";

import { useRef, useMemo, useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { PointerLockControls } from "@react-three/drei";
import { Raycaster, Vector2, Object3D, Matrix4, BoxGeometry, MeshStandardMaterial, InstancedMesh } from "three";
import MuseumHall from "./MuseumHall";
import Player from "./Player";
import ArtworkFrame from "./ArtworkFrame";
import ArtworkModal from "./ArtworkModal";
import FrameErrorBoundary from "./FrameErrorBoundary";
import MuseumError from "./MuseumError";

class PhysicsErrorBoundary extends Component<{ children: ReactNode; onError?: () => void }> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Physics Error]", error.message, info.componentStack);
    this.props.onError?.();
  }
  render() {
    return this.props.children;
  }
}

const RAY_DISTANCE = 3;
const TEXTURE_RADIUS = 30;

function MuseumContent() {
  const { camera, scene } = useThree();
  const [rooms, setRooms] = useState<any[]>([]);
  const [allArtworks, setAllArtworks] = useState<any[]>([]);
  const [selectedArt, setSelectedArt] = useState<any>(null);
  const hoveredRef = useRef<any>(null);
  const [hoveredArt, setHoveredArt] = useState<any>(null);
  const keysPressed = useRef(new Set<string>());
  const raycaster = useRef(new Raycaster());
  const center = useRef(new Vector2(0, 0));
  const frameCount = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/gallery").then((r) => r.json()),
      fetch("/api/artworks?limit=1000").then((r) => r.json()),
    ]).then(([galleryData, artworksData]) => {
      setRooms(galleryData.rooms || []);
      setAllArtworks(artworksData.data || []);
    });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const artworkMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const art of allArtworks) {
      map.set(art.source_id || art.id, art);
      map.set(art.id, art);
    }
    return map;
  }, [allArtworks]);

  // Raycasting — only check every 3rd frame to reduce load
  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return;

    raycaster.current.setFromCamera(center.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const hit = intersects.find(
      (i: any) => i.object.userData?.artworkId && i.distance < RAY_DISTANCE
    );

    const prev = hoveredRef.current;
    if (hit) {
      const data = (hit.object as any).userData;
      if (prev?.artworkId !== data.artworkId) {
        hoveredRef.current = data;
        setHoveredArt(data);
      }
      if (keysPressed.current.has("e")) {
        const art = artworkMap.get(data.artworkId);
        if (art) {
          setSelectedArt(art);
          keysPressed.current.delete("e");
        }
      }
    } else if (prev) {
      hoveredRef.current = null;
      setHoveredArt(null);
    }
  });

  return (
    <>
      {rooms.map((room: any, i: number) => (
        <MuseumHall key={room.id} room={room} isLast={i === rooms.length - 1} />
      ))}

      {allArtworks.length > 0 && <InstancedFrames artworks={allArtworks} />}

      {allArtworks
        .filter((art: any) => {
          const dx = (art.position_x || 0) - camera.position.x;
          const dz = (art.position_z || 0) - camera.position.z;
          return Math.sqrt(dx * dx + dz * dz) < TEXTURE_RADIUS;
        })
        .map((art: any) => (
          <FrameErrorBoundary key={art.source_id || art.id}>
            <ArtworkFrame
              artwork={art}
              position={[art.position_x || 0, art.position_y || 1.6, art.position_z || 0]}
              rotation={[0, art.rotation_y || 0, 0]}
              hovered={hoveredRef.current?.artworkId === (art.source_id || art.id)}
              artworkId={art.source_id || art.id}
            />
          </FrameErrorBoundary>
        ))}

      {hoveredArt && !selectedArt && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10">
          <div className="px-5 py-2.5 bg-[#050505]/90 backdrop-blur-sm border border-[#C8A96A]/20 rounded-[12px] pointer-events-none">
            <p className="text-[#F5F2EA] text-xs tracking-[0.06em] font-light">
              <span className="text-[#C8A96A] text-[10px] tracking-[0.12em] uppercase mr-2">[E]</span>
              Inspect — {hoveredArt.title?.slice(0, 50)}
            </p>
          </div>
        </div>
      )}

      {selectedArt && (
        <div className="absolute inset-0 z-20">
          <ArtworkModal
            artwork={{
              ...selectedArt,
              image_url: selectedArt.image_url_hd || selectedArt.image_url_3d || selectedArt.image_url,
            }}
            onClose={() => setSelectedArt(null)}
          />
        </div>
      )}
    </>
  );
}

function InstancedFrames({ artworks }: { artworks: any[] }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geo = useMemo(() => new BoxGeometry(2, 1.6, 0.1), []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#222" }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const count = Math.min(artworks.length, 5000);
    meshRef.current.count = count;
    for (let i = 0; i < count; i++) {
      const art = artworks[i];
      dummy.position.set(art.position_x || 0, art.position_y || 1.6, art.position_z || 0);
      dummy.rotation.y = art.rotation_y || 0;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [artworks, dummy]);

  return <instancedMesh ref={meshRef} args={[geo, mat, Math.min(artworks.length, 5000)]} />;
}

export default function GalleryWorld() {
  const [physicsError, setPhysicsError] = useState(false);

  if (physicsError) {
    return (
      <div className="w-screen h-screen bg-[#050505]">
        <MuseumError
          diagnostics={[
            { label: "WebGL", ok: true },
            { label: "Physics Engine", ok: false },
            { label: "Gallery Data", ok: true },
          ]}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-[#050505]">
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 500 }} onCreated={({ gl }) => gl.setClearColor("#050505")}>
        <fog attach="fog" args={["#050505", 10, 300]} />
        <ambientLight intensity={0.2} />
        <Suspense fallback={null}>
          <PhysicsErrorBoundary onError={() => setPhysicsError(true)}>
            <Physics gravity={[0, 0, 0]}>
              <Player />
              <MuseumContent />
            </Physics>
          </PhysicsErrorBoundary>
          <PointerLockControls />
        </Suspense>
      </Canvas>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <div className="w-8 h-8 relative">
          <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-white/20" />
          <div className="absolute left-1/2 top-1/4 bottom-1/4 w-px bg-white/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 border border-[#C8A96A]/60 rounded-full" />
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
        <div className="px-6 py-3 bg-[#050505]/80 backdrop-blur-sm border border-[#232323] rounded-[12px] pointer-events-none">
          <p className="text-[#B8B2A4] text-xs tracking-[0.08em] font-light">
            Click to enter · WASD to move · Mouse to look · <span className="text-[#C8A96A]">E</span> to inspect · ESC to pause
          </p>
        </div>
      </div>
    </div>
  );
}
