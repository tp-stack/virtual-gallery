"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import ArtworkModal from "@/components/ArtworkModal";
import GalleryWorld from "@/components/3d/GalleryWorld";
import Player from "@/components/3d/Player";
import type { Artwork, Gallery } from "@/lib/data";

export default function TourClient({
  artworks,
  gallery,
}: {
  artworks: Artwork[];
  gallery: Gallery;
}) {
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [pointerLocked, setPointerLocked] = useState(false);

  const selectedArtwork = selectedArtworkId
    ? artworks.find((a) => a.id === selectedArtworkId) || null
    : null;

  useEffect(() => {
    const onLockChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => document.removeEventListener("pointerlockchange", onLockChange);
  }, []);

  const handleArtworkClick = useCallback((artworkId: string) => {
    document.exitPointerLock();
    setSelectedArtworkId(artworkId);
  }, []);

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.1, far: 150, position: [0, 1.6, 8] }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0A0A0A");
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, 0, 0]}>
            <GalleryWorld artworks={artworks} gallery={gallery} onArtworkClick={handleArtworkClick} />
            <Player />
          </Physics>
        </Suspense>
      </Canvas>

      {pointerLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-6 h-6 relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/30" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-gold-500/80 rounded-full" />
          </div>
        </div>
      )}

      {!pointerLocked && !selectedArtwork && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-center animate-pulse">
          <div className="px-8 py-4 bg-gallery-900/70 backdrop-blur-sm border border-gold-500/30 rounded-xl">
            <p className="text-gold-400 text-sm tracking-wider">Click to Enter the Museum</p>
            <p className="text-gallery-400 text-xs mt-1">WASD to move · Mouse to look · ESC to exit</p>
          </div>
        </div>
      )}

      {!selectedArtwork && (
        <a
          href="/gallery"
          className="absolute top-6 right-6 z-10 px-4 py-2 bg-gallery-800/80 backdrop-blur-sm border border-gallery-700 rounded-lg text-gallery-300 text-xs hover:text-gold-400 hover:border-gold-500/30 transition-all"
        >
          2D Gallery
        </a>
      )}

      {selectedArtwork && (
        <div className="absolute inset-0 z-20">
          <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtworkId(null)} />
        </div>
      )}
    </div>
  );
}
