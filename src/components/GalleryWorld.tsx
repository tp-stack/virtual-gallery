"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { PointerLockControls } from "@react-three/drei";
import { Raycaster, Vector2, Mesh, BoxGeometry, MeshStandardMaterial, InstancedMesh, Object3D, Matrix4 } from "three";
import MuseumHall from "./MuseumHall";
import Player from "./Player";
import ArtworkFrame from "./ArtworkFrame";
import ArtworkModal from "./ArtworkModal";

const CHUNK_AHEAD = 2;
const CHUNK_BEHIND = 1;
const RAY_DISTANCE = 3;
const TEXTURE_RADIUS = 20;

function MuseumContent() {
  const { camera, scene } = useThree();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadedRooms, setLoadedRooms] = useState<Record<number, any[]>>({});
  const [playerRoomId, setPlayerRoomId] = useState(0);
  const [selectedArt, setSelectedArt] = useState<any>(null);
  const [hoveredArt, setHoveredArt] = useState<any>(null);
  const keysPressed = useRef(new Set<string>());
  const raycaster = useRef(new Raycaster());
  const center = useRef(new Vector2(0, 0));

  // Fetch room metadata
  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms || []));
  }, []);

  // Key listeners
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

  // Determine which rooms to load based on player position
  const roomsToLoad = useMemo(() => {
    if (rooms.length === 0) return [];
    const current = Math.max(0, Math.min(playerRoomId, rooms.length - 1));
    const start = Math.max(0, current - CHUNK_BEHIND);
    const end = Math.min(rooms.length, current + CHUNK_AHEAD + 1);
    return rooms.slice(start, end);
  }, [rooms, playerRoomId]);

  // Fetch artwork data for visible rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const newLoaded: Record<number, any[]> = {};
      for (const room of roomsToLoad) {
        if (loadedRooms[room.room_id]) {
          newLoaded[room.room_id] = loadedRooms[room.room_id];
          continue;
        }
        try {
          const res = await fetch(`/api/rooms/${room.room_id}`);
          const data = await res.json();
          newLoaded[room.room_id] = data.artworks || [];
        } catch {}
      }
      setLoadedRooms((prev) => ({ ...prev, ...newLoaded }));
    };
    fetchRooms();
  }, [roomsToLoad]);

  // Raycasting + player position tracking
  useFrame(() => {
    // Track player Z position to determine current room
    const playerZ = camera.position.z;
    for (const room of rooms) {
      const roomZ = room.position?.z || 0;
      if (playerZ >= roomZ && playerZ < roomZ + (room.depth || 20)) {
        if (room.room_id !== playerRoomId) setPlayerRoomId(room.room_id);
        break;
      }
    }

    // Raycast from center of screen
    raycaster.current.setFromCamera(center.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const hit = intersects.find(
      (i: any) => i.object.userData?.artworkId && i.distance < RAY_DISTANCE
    );

    if (hit) {
      const art = (hit.object as any).userData;
      setHoveredArt(art);

      if (keysPressed.current.has("e")) {
        // Find the full artwork data
        for (const [, arts] of Object.entries(loadedRooms)) {
          const found = (arts as any[]).find((a: any) => a.id === art.id || a.source_id === art.artworkId);
          if (found) {
            setSelectedArt(found);
            keysPressed.current.delete("e");
            break;
          }
        }
      }
    } else {
      setHoveredArt(null);
    }
  });

  // Collect all visible artworks and their positions for instancing
  const frameArtworks = useMemo(() => {
    const result: any[] = [];
    for (const room of roomsToLoad) {
      const arts = loadedRooms[room.room_id] || [];
      for (const art of arts) {
        result.push(art);
      }
    }
    return result;
  }, [roomsToLoad, loadedRooms]);

  return (
    <>
      {roomsToLoad.map((room: any) => (
        <MuseumHall
          key={room.id}
          room={room}
          isLast={false}
        />
      ))}

      {/* Instanced frames for all visible artworks */}
      {frameArtworks.length > 0 && (
        <InstancedFrames artworks={frameArtworks} cameraPosition={camera.position} />
      )}

      {/* Individual artwork images (textured) within radius */}
      {frameArtworks
        .filter((art: any) => {
          const dx = (art.position_x || 0) - camera.position.x;
          const dz = (art.position_z || 0) - camera.position.z;
          return Math.sqrt(dx * dx + dz * dz) < TEXTURE_RADIUS;
        })
        .map((art: any) => (
          <ArtworkFrame
            key={art.source_id || art.id}
            artwork={art}
            position={[art.position_x || 0, art.position_y || 1.6, art.position_z || 0]}
            rotation={[0, art.rotation_y || 0, 0]}
            hovered={hoveredArt?.artworkId === (art.source_id || art.id)}
            artworkId={art.source_id || art.id}
          />
        ))}

      {/* Hover prompt */}
      {hoveredArt && !selectedArt && (
        <div
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white px-4 py-2 rounded border border-gold-500/50 pointer-events-none text-sm"
        >
          [E] Inspect {hoveredArt.title?.slice(0, 50)}
        </div>
      )}

      {selectedArt && (
        <div className="absolute inset-0 z-20">
          <ArtworkModal
            artwork={{
              ...selectedArt,
              image_url: selectedArt.image_url_hd || selectedArt.image_url_3d,
            }}
            onClose={() => setSelectedArt(null)}
          />
        </div>
      )}
    </>
  );
}

function InstancedFrames({
  artworks,
  cameraPosition,
}: {
  artworks: any[];
  cameraPosition: any;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const matrix = useMemo(() => new Matrix4(), []);
  const geo = useMemo(() => new BoxGeometry(2, 1.6, 0.1), []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#222" }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const count = Math.min(artworks.length, 1000);
    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < count; i++) {
      const art = artworks[i];
      dummy.position.set(
        art.position_x || 0,
        art.position_y || 1.6,
        art.position_z || 0
      );
      dummy.rotation.y = art.rotation_y || 0;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [artworks, dummy, matrix]);

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, Math.min(artworks.length, 1000)]} />
  );
}

export default function GalleryWorld() {
  return (
    <div className="w-screen h-screen relative bg-gallery-900">
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 250 }}>
        <fog attach="fog" args={["#0A0A0A", 10, 120]} />
        <ambientLight intensity={0.2} />
        <Suspense fallback={null}>
          <Physics gravity={[0, 0, 0]}>
            <Player />
            <MuseumContent />
          </Physics>
          <PointerLockControls />
        </Suspense>
      </Canvas>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gallery-300 text-sm bg-gallery-900/80 px-4 py-2 rounded pointer-events-none">
        Click to enter | WASD to move | Mouse to look | E to inspect art | ESC to pause
      </div>
    </div>
  );
}
