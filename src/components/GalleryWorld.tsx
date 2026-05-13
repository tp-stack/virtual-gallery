"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useState } from "react";
import { PointerLockControls } from "@react-three/drei";
import MuseumHall from "./MuseumHall";
import Player from "./Player";
import ArtworkFrame from "./ArtworkFrame";
import ArtworkModal from "./ArtworkModal";

type GalleryData = {
  rooms: any[];
  artworks: any[];
  artwork_positions: Record<string, { x: number; y: number; z: number; rotY: number }>;
};

export default function GalleryWorld() {
  const [selectedArt, setSelectedArt] = useState<any>(null);
  const [data, setData] = useState<GalleryData | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="w-screen h-screen bg-gallery-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gallery-100 text-xl font-display">Loading Museum Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-gallery-900">
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 250 }}>
        <fog attach="fog" args={["#0A0A0A", 10, 120]} />
        <ambientLight intensity={0.2} />

        <Suspense fallback={null}>
          <Physics gravity={[0, 0, 0]}>
            <Player />

            {data.rooms.map((room, i) => (
              <MuseumHall
                key={room.id}
                room={{
                  ...room,
                  dimensions: { width: room.width || 30, depth: room.depth || 20 },
                }}
                isLast={i === data.rooms.length - 1}
              />
            ))}

            {data.artworks.map((art) => {
              const pos = data.artwork_positions[art.id];
              if (!pos) return null;
              return (
                <ArtworkFrame
                  key={art.id}
                  artwork={art}
                  position={[pos.x, pos.y, pos.z]}
                  rotation={[0, pos.rotY, 0]}
                  onSelect={setSelectedArt}
                />
              );
            })}
          </Physics>

          <PointerLockControls />
        </Suspense>
      </Canvas>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full pointer-events-none" />

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gallery-300 text-sm bg-gallery-900/80 px-4 py-2 rounded pointer-events-none">
        Click to enter | WASD to move | Mouse to look | E to inspect art | ESC to pause
      </div>

      {selectedArt && (
        <div className="absolute inset-0 z-20">
          <ArtworkModal
            artwork={{
              ...selectedArt,
              image_url: selectedArt.image_url_hd || selectedArt.image_url,
            }}
            onClose={() => setSelectedArt(null)}
          />
        </div>
      )}
    </div>
  );
}
