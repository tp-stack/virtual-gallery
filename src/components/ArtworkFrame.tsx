"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

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
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [errored, setErrored] = useState(false);
  const mountedRef = useRef(true);

  const imgUrl = artwork.image_url_3d || artwork.image_url;

  useEffect(() => {
    if (!imgUrl) return;
    mountedRef.current = true;
    setErrored(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!mountedRef.current) return;
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      setTexture(tex);
    };
    img.onerror = () => {
      if (!mountedRef.current) return;
      setErrored(true);
    };
    img.src = imgUrl;

    return () => {
      mountedRef.current = false;
    };
  }, [imgUrl]);

  const aspect = (() => {
    try {
      const dims = (artwork.dimensions || "1x1").split("x").map((s: string) => parseFloat(s.trim()));
      if (dims.length === 2 && dims[0] > 0 && dims[1] > 0) return dims[0] / dims[1];
    } catch {}
    return 1.4;
  })();

  const frameW = 1.8;
  const frameH = frameW / aspect;

  const hasTexture = texture && !errored;

  return (
    <group position={position} rotation={rotation}>
      {/* Backboard */}
      <mesh position={[0, 0, -0.05]} userData={{ artworkId, title: artwork.title }}>
        <boxGeometry args={[frameW + 0.1, frameH + 0.1, 0.1]} />
        <meshStandardMaterial color={hovered ? "#333" : "#1a1a1a"} />
      </mesh>

      {/* Gold frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameW + 0.2, frameH + 0.2, 0.03]} />
        <meshStandardMaterial color={hovered ? "#D4B96A" : "#8B7355"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Painting surface */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial
          color={errored ? "#2a2a2a" : "#1a1a1a"}
          map={hasTexture ? texture : undefined}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
