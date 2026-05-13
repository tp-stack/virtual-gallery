"use client";

import { Suspense, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

function PaintingTexture({ url, frameW, frameH }: { url: string; frameW: number; frameH: number }) {
  try {
    const texture = useLoader(THREE.TextureLoader, url);
    return (
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial map={texture} toneMapped={false} />
      </mesh>
    );
  } catch {
    return (
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    );
  }
}

function PaintingFallback({ frameW, frameH }: { frameW: number; frameH: number }) {
  return (
    <mesh position={[0, 0, 0.02]}>
      <planeGeometry args={[frameW, frameH]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

export default function ArtworkFrame({
  artwork,
  position,
  rotation,
  hovered,
  artworkId,
}: {
  artwork: any;
  position: [number, number, number];
  rotation: [number, number, number];
  hovered: boolean;
  artworkId: string;
}) {
  const imgUrl = artwork.image_url_3d || artwork.image_url;
  if (!imgUrl) return null;

  const aspect = (() => {
    try {
      const dims = (artwork.dimensions || "1x1").split("x").map((s: string) => parseFloat(s.trim()));
      if (dims.length === 2 && dims[0] > 0 && dims[1] > 0) return dims[0] / dims[1];
    } catch {}
    return 1.4;
  })();

  const frameW = 1.8;
  const frameH = frameW / aspect;

  return (
    <group position={position} rotation={rotation}>
      {/* Backboard with userData for raycasting */}
      <mesh position={[0, 0, -0.05]} userData={{ artworkId, title: artwork.title }}>
        <boxGeometry args={[frameW + 0.1, frameH + 0.1, 0.1]} />
        <meshStandardMaterial color={hovered ? "#333" : "#1a1a1a"} />
      </mesh>

      {/* Gold frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameW + 0.2, frameH + 0.2, 0.03]} />
        <meshStandardMaterial color={hovered ? "#D4B96A" : "#8B7355"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Painting texture with suspense fallback */}
      <Suspense fallback={<PaintingFallback frameW={frameW} frameH={frameH} />}>
        <PaintingTexture url={imgUrl} frameW={frameW} frameH={frameH} />
      </Suspense>
    </group>
  );
}
